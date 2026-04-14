"""Strict one-observation-at-a-time FDA Form 483 drafting: prompts, JSON parse, validation."""

from __future__ import annotations

import json
import logging
import re

from app.schemas.inspection import ObservationInput, ObservationOutput, SegmentedObservation
from app.services.utils_cfr import cfr_match

logger = logging.getLogger(__name__)

SEGMENTATION_SYSTEM_PROMPT = """
You are extracting FDA inspection observations from raw inspection notes.

STRICT RULES:
- Split the input into DISTINCT observations.
- Each observation must describe ONE regulatory issue (one CFR violation or deficiency).
- DO NOT split a single issue into multiple observations just because it has multiple supporting facts or evidence bullets.
- If several sentences describe the SAME underlying regulatory issue, they belong in ONE observation with multiple evidence items.
- DO NOT create separate observations for examples, supporting details, or sub-findings of the same issue.
- If in doubt whether two points are separate issues or one: keep them as ONE observation with bullet-point evidence.
- DO NOT summarize or rewrite meaning.
- Keep wording close to source.

GROUPING GUIDANCE (CRITICAL — follow strictly):
- Same CFR section = same observation (group together).
- Same equipment/process/area with related deficiencies = same observation.
- Different CFR sections or fundamentally different process areas = separate observations.
- If a general finding is stated and then SPECIFIC EXAMPLES follow (e.g. specific batches, specific products, specific ANDAs, specific supplements, specific dates), ALL of them belong in ONE observation. The examples are EVIDENCE for the finding, not separate observations.
- If the text says something like "For example:" or lists bullet points under a finding, those bullets are evidence items — NOT separate observations.
- Prior Approval Supplements, ANDAs, batch records, annual reports that illustrate the SAME deficiency = ONE observation with multiple evidence bullets.

OUTPUT FORMAT:
Return JSON:
{
  "observations": [
    {
      "raw_text": "the main finding text including all examples and sub-points",
      "evidence": ["specific example 1", "specific example 2", "..."]
    }
  ]
}
""".strip()

DRAFT_483_SYSTEM_PROMPT = """
You are drafting FDA Form 483 observations.

You will receive EXACTLY ONE observation input.

STRICT RULES (NON-NEGOTIABLE):
- Generate ONLY ONE observation output — never two or more.
- If the input contains multiple sub-issues, group them into a SINGLE observation using bullet points within the drafted_text.
- DO NOT split the input into multiple observations.
- DO NOT introduce new facts or issues not present in the input.
- ONLY use the provided input text and evidence.
- Preserve the original meaning; maintain FDA 483 style.

EVIDENCE EXTRACTION RULE (STRICT — NON-NEGOTIABLE):
You MUST extract evidence EXACTLY from the input text.
- Copy exact phrases CHARACTER-FOR-CHARACTER from the RAW OBSERVATION or EVIDENCE fields.
- DO NOT paraphrase evidence.
- DO NOT summarize evidence.
- DO NOT rewrite evidence in your own words.
- Each evidence_used item MUST be a direct substring of the input text.
- If you cannot find an exact quote, omit that evidence item rather than inventing one.

BAD evidence (paraphrased — REJECTED):
  "The quality unit failed to review data"

GOOD evidence (exact extraction — ACCEPTED):
  "The Quality Unit failed to review electronic data as part of batch release"

OUTPUT FORMAT:
Return a SINGLE JSON object (NOT an array):
{
  "drafted_text": "...",
  "evidence_used": ["exact phrase from input 1", "exact phrase from input 2"],
  "cfr_citation": "21 CFR ..."
}

- drafted_text: the complete drafted observation text (one observation only).
- evidence_used: array of EXACT SUBSTRING QUOTES from the input text.
- cfr_citation: full CFR format, e.g. "21 CFR 211.22(a)". Do NOT return bare fragments like "211".

If you return more than one observation or a JSON array, YOUR RESPONSE WILL BE REJECTED.
""".strip()


def build_draft_483_prompt(obs: ObservationInput) -> str:
    ev_block = "\n".join(f"- {e}" for e in (obs.evidence or [])) or "(none)"
    cfr_block = "\n".join(f"- {c}" for c in (obs.cfr_candidates or [])) or "(none)"
    return f"""
Observation ID: {obs.obs_id}

RAW OBSERVATION (this is ONE observation — do NOT split it):
{obs.raw_text}

EVIDENCE (must reuse exact phrases):
{ev_block}

CFR OPTIONS:
{cfr_block}

INSTRUCTION: Draft EXACTLY ONE FDA 483 observation for the above input.
Return a single JSON object with keys: drafted_text, evidence_used, cfr_citation.
If multiple sub-issues exist, use bullet points WITHIN the single drafted_text.
Do NOT return multiple observations or a JSON array.

CRITICAL: Each item in evidence_used MUST be an EXACT substring copied from the RAW OBSERVATION above.
Do NOT paraphrase or rewrite evidence. Copy character-for-character.
""".strip()


def parse_draft_483_json(reply: str) -> dict | None:
    """Extract a single JSON object from model output (fences, balanced braces).

    If the LLM returns a JSON array instead of an object, extracts the first
    element and logs a warning — this enforces 1:1 mapping discipline.
    """
    text = (reply or "").strip()
    if not text:
        return None
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    candidate = fence.group(1).strip() if fence else text

    arr_start = candidate.find("[")
    obj_start = candidate.find("{")

    if arr_start >= 0 and (obj_start < 0 or arr_start < obj_start):
        try:
            arr, _ = json.JSONDecoder().raw_decode(candidate[arr_start:])
            if isinstance(arr, list) and arr:
                logger.warning(
                    "LLM returned a JSON array with %d items instead of a single object — "
                    "taking first element only (over-generation guard)",
                    len(arr),
                )
                first = arr[0]
                if isinstance(first, dict):
                    return first
        except json.JSONDecodeError:
            pass

    if obj_start < 0:
        return None
    try:
        obj, _ = json.JSONDecoder().raw_decode(candidate[obj_start:])
        if isinstance(obj, dict):
            if "observations" in obj and isinstance(obj["observations"], list):
                pass
            elif any(isinstance(v, list) and v and isinstance(v[0], dict) and "drafted_text" in v[0]
                     for v in obj.values()):
                logger.warning("Nested observations detected in draft response — extracting first")
                for v in obj.values():
                    if isinstance(v, list) and v and isinstance(v[0], dict) and "drafted_text" in v[0]:
                        return v[0]
            return obj
        return None
    except json.JSONDecodeError:
        return None


def parse_segmentation_json(reply: str) -> dict | None:
    """Parse segmentation LLM output; must contain an ``observations`` array."""
    obj = parse_draft_483_json(reply)
    if not obj or not isinstance(obj.get("observations"), list):
        return None
    return obj


def normalize_evidence_text(text: str) -> str:
    """Collapse punctuation/OCR noise for evidence substring checks (reduces false negatives)."""
    return re.sub(r"\W+", " ", (text or "").lower()).strip()


def segmentation_quality_heuristic(
    raw_text: str, segmented: list[SegmentedObservation]
) -> tuple[bool, bool]:
    """
    Lightweight signal: period count as a rough proxy for distinct sentences/issues.
    If there are fewer segments than '.' counts, segmentation may have merged issues.

    Returns (segmentation_valid, segmentation_warning). Warning is True when validity is False.
    When there are no '.' delimiters, we do not infer a minimum segment count (no warning).
    """
    rt = raw_text or ""
    expected = rt.count(".")
    n = len(segmented)
    if expected <= 0:
        return True, False
    if n < expected:
        return False, True
    return True, False


def validate_segmentation(observations: list[SegmentedObservation]) -> bool:
    seen: set[str] = set()
    to_remove: list[int] = []
    for i, obs in enumerate(observations):
        rt = (obs.raw_text or "").strip()
        if not rt:
            raise ValueError("❌ Empty observation detected")
        if rt in seen:
            to_remove.append(i)
            continue
        seen.add(rt)
    for idx in reversed(to_remove):
        observations.pop(idx)
    return True


def _prefix_for_leak_check(raw: str) -> str:
    t = (raw or "").strip()
    if len(t) <= 80:
        return t
    return t[:80]


def validate_draft_483_observation(
    input_obs: ObservationInput,
    output_obs: ObservationOutput,
    global_observations: list[ObservationInput],
) -> bool:
    """
    Post-generation checks: ID match, cross-observation leakage, evidence grounding.
    `global_observations` is the full batch (replaces a mutable GLOBAL list).
    """
    if input_obs.obs_id != output_obs.obs_id:
        raise ValueError("Obs ID mismatch")

    drafted = (output_obs.drafted_text or "").strip()
    drafted_l = drafted.casefold()
    for other in global_observations:
        if other.obs_id == input_obs.obs_id:
            continue
        prefix = _prefix_for_leak_check(other.raw_text)
        if prefix and prefix.casefold() in drafted_l:
            logger.warning("Cross-observation leakage detected for obs %s (non-fatal)", input_obs.obs_id)

    pool_joined = " ".join(input_obs.evidence or [])
    pool_n = normalize_evidence_text(pool_joined)
    if pool_n.strip():
        for ev in output_obs.evidence_used or []:
            ev_n = normalize_evidence_text(ev or "")
            if ev_n and ev_n not in pool_n:
                logger.warning("Possible hallucinated evidence for obs %s (non-fatal)", input_obs.obs_id)
    elif output_obs.evidence_used:
        logger.warning("Evidence cited but input evidence empty for obs %s (non-fatal)", input_obs.obs_id)

    if input_obs.cfr_candidates:
        cit = (output_obs.cfr_citation or "").strip()
        if not cit:
            raise ValueError(
                "The model returned an empty CFR citation, but applicable CFR parts were selected. "
                "Try generating again, or clear CFR part checkboxes to allow any citation."
            )
        if not cfr_match(output_obs.cfr_citation, list(input_obs.cfr_candidates)):
            raise ValueError(
                f"The drafted CFR citation ({cit!r}) does not match the CFR parts you selected "
                f"({list(input_obs.cfr_candidates)!r}). Try again, adjust selected parts, or clear CFR parts."
            )

    return True
