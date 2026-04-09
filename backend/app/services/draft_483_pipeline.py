"""Strict one-observation-at-a-time FDA Form 483 drafting: prompts, JSON parse, validation."""

from __future__ import annotations

import json
import re

from app.schemas.inspection import ObservationInput, ObservationOutput, SegmentedObservation
from app.services.utils_cfr import cfr_match

SEGMENTATION_SYSTEM_PROMPT = """
You are extracting FDA inspection observations from raw inspection notes.

STRICT RULES:
- Split the input into DISTINCT observations.
- Each observation must describe ONE issue only.
- DO NOT merge multiple issues.
- DO NOT summarize.
- DO NOT rewrite meaning.
- Keep wording close to source.

OUTPUT FORMAT:
Return JSON:
{
  "observations": [
    {
      "raw_text": "...",
      "evidence": ["..."]
    }
  ]
}
""".strip()

DRAFT_483_SYSTEM_PROMPT = """
You are drafting FDA Form 483 observations.

STRICT RULES (NON-NEGOTIABLE):
- You will receive EXACTLY ONE observation.
- You MUST produce EXACTLY ONE observation.
- DO NOT combine multiple issues.
- DO NOT summarize multiple observations.
- DO NOT introduce new facts.
- ONLY use the provided input text and evidence.

OUTPUT FORMAT:
Return JSON with:
- drafted_text
- evidence_used
- cfr_citation

Return CFR citations in full format, e.g. "21 CFR 211.22(a)".
Do NOT return bare section fragments such as "211" or "CFR 211" without proper structure.

Ensure the drafted_text reflects ONLY the given observation.
""".strip()


def build_draft_483_prompt(obs: ObservationInput) -> str:
    ev_block = "\n".join(f"- {e}" for e in (obs.evidence or [])) or "(none)"
    cfr_block = "\n".join(f"- {c}" for c in (obs.cfr_candidates or [])) or "(none)"
    return f"""
Observation ID: {obs.obs_id}

RAW OBSERVATION:
{obs.raw_text}

EVIDENCE (must reuse exact phrases):
{ev_block}

CFR OPTIONS:
{cfr_block}

Draft a SINGLE FDA 483 observation.
""".strip()


def parse_draft_483_json(reply: str) -> dict | None:
    """Extract a single JSON object from model output (fences, balanced braces)."""
    text = (reply or "").strip()
    if not text:
        return None
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    candidate = fence.group(1).strip() if fence else text
    start = candidate.find("{")
    if start < 0:
        return None
    try:
        obj, _ = json.JSONDecoder().raw_decode(candidate[start:])
        return obj if isinstance(obj, dict) else None
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
    for obs in observations:
        rt = (obs.raw_text or "").strip()
        if not rt:
            raise ValueError("❌ Empty observation detected")
        if rt in seen:
            raise ValueError("❌ Duplicate observation detected")
        seen.add(rt)
    return True


def _prefix_for_leak_check(raw: str) -> str:
    t = (raw or "").strip()
    if len(t) <= 30:
        return t
    return t[:30]


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
            raise ValueError("❌ Cross-observation leakage detected")

    pool_joined = " ".join(input_obs.evidence or [])
    pool_n = normalize_evidence_text(pool_joined)
    if pool_n.strip():
        for ev in output_obs.evidence_used or []:
            ev_n = normalize_evidence_text(ev or "")
            if ev_n and ev_n not in pool_n:
                raise ValueError("❌ Hallucinated evidence detected")
    elif output_obs.evidence_used:
        raise ValueError("❌ Hallucinated evidence detected: input evidence empty but evidence_used is not")

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
