from __future__ import annotations
import json
import logging
import re
import uuid
from typing import Any, Optional

from langchain_core.messages import SystemMessage, HumanMessage
from app.schemas.inspection import (
    DraftObservation,
    EIRPipelineNarrative,
    EIRPipelineObservationLink,
    ValidationResult,
    EIRNarrative,
    InspectionMetadata,
    ObservationInput,
    ObservationOutput,
    SegmentedObservation,
)
from app.services.eir_coverage import (
    build_eir_pipeline_strict_addon,
    build_eir_retry_prompt,
    ensure_observation_ids,
    synthesize_missing_pipeline_coverage,
    validate_eir_pipeline_coverage,
    validate_observations_for_eir,
)

logger = logging.getLogger(__name__)

# Large cap so bundled OCR + typed notes (many pages / many observations) stay in context.
_MAX_RAW_NOTES_FOR_483 = 120_000

# Shown when the model's `source_notes_excerpt` cannot be aligned to raw/OCR text (see `_source_excerpt_matches_raw_notes`).
REVIEW_FLAG_SOURCE_EXCERPT_MISMATCH = (
    "Source excerpt not aligned with raw inspection notes: the model's source_notes_excerpt could not be matched to the "
    "uploaded/OCR text (after normalization). This flags possible misquoting — it does NOT compare 'how many' input vs "
    "output observations; raw notes are usually unstructured. Verify OCR alignment or edit the excerpt."
)

REVIEW_FLAG_COUNT_MISMATCH = (
    "Draft observation count does not match the estimated number of distinct issues supported by the OCR/raw notes "
    "(pre-draft analysis). Reconcile by merging or splitting observations, or edit notes and re-run."
)

REVIEW_FLAG_MERGED_DUPLICATE_CFR = (
    "Multiple draft rows cited the same 21 CFR section basis; they were merged into one observation with combined "
    "evidence and excerpts. Verify wording before filing."
)

REVIEW_FLAG_CFR_NOT_EXACT_REFERENCE_MATCH = (
    "CFR citation was not matched to the Title 21 reference dataset at the required confidence (≥0.95). "
    "Correct the citation text, or add the section to the Title 21 data (CSV or XML under data/title21)."
)

# Cap for the issue-count estimation call (first stage of the 483 drafting pipeline).
_MAX_NOTES_FOR_COUNT_ESTIMATE = 80_000
_MIN_NOTES_LEN_FOR_COUNT_ESTIMATE = 50
_MAX_ISSUE_COUNT_ESTIMATE = 25

ESTIMATE_OBSERVATION_COUNT_SYSTEM = """You are a senior FDA ORA investigator. You analyze raw inspection notes (which may include OCR) and count how many **distinct** inspectional issues the text supports for Form FDA 483.
Rules:
- Count each separate CGMP deficiency once; merge duplicate OCR mentions of the same defect.
- **Regulatory basis:** If several findings would cite the **same primary 21 CFR section** (same section number, e.g. 211.22), count them as **one** issue to be drafted as **one** observation combining those findings.
- Do not count page headers, signatures, or administrative boilerplate as inspectional issues.
- Do not invent issues not implied by the text.
- If ambiguous, prefer a conservative (lower) count.
- Respond with valid JSON only, matching the exact shape requested in the user message."""


def _normalize_notes_for_match(text: str) -> str:
    """Collapse whitespace and lowercase so OCR vs model spacing differences don't false-flag."""
    t = (text or "").lower()
    return re.sub(r"\s+", " ", t).strip()


def _source_excerpt_matches_raw_notes(excerpt: str, canonical_notes: str) -> bool:
    """
    Return True if `excerpt` is plausibly taken from `canonical_notes` (verbatim, normalized, substring window, or word overlap).

    The pipeline does **not** assert equality between 'input observations' and 'generated observations' — investigators
    typically paste one blob of notes/OCR; the model produces structured 483 items. This check only validates the
    optional excerpt field the model returns for traceability.
    """
    excerpt = (excerpt or "").strip()
    if not excerpt:
        return True
    src_raw = (canonical_notes or "").strip()
    if not src_raw:
        return False

    ex = _normalize_notes_for_match(excerpt)
    src = _normalize_notes_for_match(src_raw)
    if len(ex) < 6:
        return ex in src

    if ex in src:
        return True

    # Long substring windows (handles minor truncation / line breaks in OCR)
    for win in (72, 48, 32, 24):
        if len(ex) >= win:
            for i in range(0, len(ex) - win + 1):
                if ex[i : i + win] in src:
                    return True

    # Word overlap: OCR or the model may alter punctuation/spaces
    words_ex = [w for w in re.findall(r"[a-z0-9]{4,}", ex)]
    if len(words_ex) < 2:
        return False
    src_tokens = set(re.findall(r"[a-z0-9]{4,}", src))
    hits = sum(1 for w in words_ex if w in src_tokens)
    return hits / len(words_ex) >= 0.5


def _cfr_merge_key(cfr_citation: str) -> str:
    """Group 21 CFR 211.22(a) and 21 CFR 211.22 under one bucket for deduplication."""
    t = (cfr_citation or "").strip()
    m = re.search(r"21\s*cfr\s*(\d+(?:\.\d+)*)", t, re.IGNORECASE)
    if m:
        return m.group(1).lower()
    return re.sub(r"\s+", " ", t.lower())


def _dedupe_str_list_preserve_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in items:
        s = (x or "").strip()
        if not s or s in seen:
            continue
        seen.add(s)
        out.append(s)
    return out


def merge_duplicate_cfr_observations(observations: list[DraftObservation]) -> list[DraftObservation]:
    """
    Combine multiple draft rows that cite the same 21 CFR section basis into one observation.

    Grounding: preserves evidence and text from the model but reduces duplicate regulatory rows.
    """
    if len(observations) <= 1:
        return observations

    buckets: dict[str, list[DraftObservation]] = {}
    for i, obs in enumerate(observations):
        cfr = (obs.cfr_citation or "").strip()
        if re.search(r"21\s*cfr\s*\d", cfr, re.IGNORECASE):
            key = _cfr_merge_key(cfr)
        else:
            # Do not merge rows with missing/invalid CFR together
            key = f"__no_cfr_{i}"
        if key not in buckets:
            buckets[key] = []
        buckets[key].append(obs)

    merged: list[DraftObservation] = []
    for _key, group in buckets.items():
        if len(group) == 1:
            merged.append(group[0])
            continue

        primary = group[0]
        texts = [o.observation_text.strip() for o in group if (o.observation_text or "").strip()]
        combined_text = texts[0] if len(texts) == 1 else "\n\n".join(f"({i}) {t}" for i, t in enumerate(texts, start=1))

        evs: list[str] = []
        for o in group:
            evs.extend(o.evidence_list or [])
        combined_ev = _dedupe_str_list_preserve_order(evs)

        excerpts = [o.source_notes_excerpt.strip() for o in group if (o.source_notes_excerpt or "").strip()]
        combined_ex = " | ".join(excerpts[:8]) if len(excerpts) > 1 else (excerpts[0] if excerpts else "")

        flags: list[str] = []
        for o in group:
            flags.extend(o.review_flags or [])
        flags.append(REVIEW_FLAG_MERGED_DUPLICATE_CFR)
        flags = list(dict.fromkeys(flags))

        scores = [o.confidence_score for o in group if isinstance(o.confidence_score, (int, float))]
        avg_conf = sum(scores) / len(scores) if scores else primary.confidence_score

        merged.append(
            DraftObservation(
                id=primary.id,
                observation_text=combined_text,
                cfr_citation=primary.cfr_citation or group[0].cfr_citation,
                evidence_list=combined_ev,
                confidence_score=min(1.0, float(avg_conf)),
                source_notes_excerpt=combined_ex,
                review_flags=flags,
            )
        )

    return merged


_EIR_CAMEL_TO_SNAKE = {
    "coverInfo": "cover_info",
    "purposeScope": "purpose_scope",
    "regulatoryFramework": "regulatory_framework",
    "backgroundScope": "background_scope",
    "inspectionMethodology": "inspection_methodology",
    "observationsSummary": "observations_summary",
    "evidenceDescriptions": "evidence_descriptions",
    "chronologicalAccount": "chronological_account",
    "referencesAndCitations": "references_and_citations",
}


def _parse_eir_json_from_llm_reply(reply: str) -> dict | None:
    """Extract a JSON object from LLM output (markdown fences, balanced braces via json.raw_decode)."""
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


def _coerce_eir_dict(raw: dict) -> dict:
    """Map camelCase keys and keep only EIRNarrative fields."""
    out: dict = {}
    for k, v in raw.items():
        nk = _EIR_CAMEL_TO_SNAKE.get(k, k)
        key = nk if nk in EIRNarrative.model_fields else (k if k in EIRNarrative.model_fields else None)
        if key is None:
            continue
        out[key] = "" if v is None else str(v)
    return out


def _coerce_eir_pipeline_dict(raw: dict) -> dict:
    """EIR narrative fields plus traceability array."""
    base = _coerce_eir_dict({k: v for k, v in raw.items() if k != "traceability"})
    tr_out: list[dict] = []
    tr = raw.get("traceability")
    if isinstance(tr, list):
        for item in tr:
            if not isinstance(item, dict):
                continue
            tr_out.append(
                {
                    "observation_index": int(item.get("observation_index", 0) or 0),
                    "observation_id": str(item.get("observation_id", "") or ""),
                    "cfr_citation": str(item.get("cfr_citation", "") or ""),
                    "evidence_sources": list(item.get("evidence_sources") or []),
                    "compliance_discussion": str(item.get("compliance_discussion", "") or ""),
                }
            )
    base["traceability"] = tr_out
    return base


def _fill_empty_eir_sections(narrative: EIRNarrative, observations: list[DraftObservation]) -> EIRNarrative:
    """Ensure sections 5–8 have content when the model omits or truncates them."""
    d = narrative.model_dump()

    def _blank(s: str | None) -> bool:
        return not (s or "").strip()

    cfrs = sorted({(o.cfr_citation or "").strip() for o in observations if (o.cfr_citation or "").strip()})

    if _blank(d.get("observations_summary")):
        parts = [
            f"Observation {i} ({o.cfr_citation or 'CFR pending'}): {o.observation_text or '(no text)'}"
            for i, o in enumerate(observations, 1)
        ]
        d["observations_summary"] = "\n\n".join(parts) if parts else ""

    if _blank(d.get("evidence_descriptions")):
        lines = []
        for i, o in enumerate(observations, 1):
            ev = "; ".join(e for e in (o.evidence_list or []) if (e or "").strip())
            if ev:
                lines.append(f"Observation {i}: {ev}")
        d["evidence_descriptions"] = (
            "\n".join(lines)
            if lines
            else "Objective evidence is summarized in the Detailed findings table and in the raw inspection notes."
        )

    if _blank(d.get("chronological_account")):
        d["chronological_account"] = (
            "Inspection activities proceeded in line with the areas and records reflected in the observations above. "
            "Use the source notes excerpts and firm records for specific dates and sequence detail."
        )

    if _blank(d.get("references_and_citations")):
        d["references_and_citations"] = (
            "\n".join(f"• {c}" for c in cfrs) if cfrs else "• 21 CFR citations as cited for each observation above."
        )

    return EIRNarrative.model_validate(d)

EIR_PIPELINE_SYSTEM_PROMPT = """You are an FDA ORA investigator drafting the **Establishment Inspection Report (EIR)** after Form FDA 483 has been finalized and transmitted.
Your task is **EIR narrative and compliance discussion only** — not Form FDA 483 language. Expand observations into inspection narrative: scope, methodology, objective findings, evidence, and regulatory discussion.
Ground every substantive claim in the structured 483 observations, raw notes, and evidence sources provided. Maintain **explicit traceability**: each 483 item must map to narrative discussion and evidence references.

**COVERAGE (NON-NEGOTIABLE):** The input lists **every** Form FDA 483 observation. You MUST include **ALL** of them in the output `traceability` array — **one object per observation**, with the exact `observation_id` from the input. Do **not** merge, drop, or summarize away any observation. If you omit any observation, the output is invalid.
Use professional ORA documentation tone. Do not name individuals. Output valid JSON only (no markdown fences)."""

EIR_SYSTEM_PROMPT = """You are an FDA ORA investigator drafting the **narrative portion** of an Establishment Inspection Report (EIR).
Ground every statement in: (1) the inspection observations and raw notes provided, (2) **21 CFR** where applicable, and (3) **Investigations Operations Manual (IOM)** practice for inspection documentation (e.g., describing scope, methodology, findings, and evidence in a factual, objective tone).

Requirements:
- Align the **substance** of findings with the draft Form FDA 483 observations: same CFR citations and themes; expand with narrative context suitable for an EIR (background, how the condition was documented, records or physical evidence reviewed).
- Use clear regulatory language; cite **21 CFR** sections explicitly where tied to each finding (e.g., "21 CFR 211.22(a)").
- Reference IOM expectations only where appropriate (e.g., documentation of inspection activities, evidence gathering)—do not invent IOM section numbers; speak generically to IOM practice when needed.
- Preserve **evidence** from the input notes (lot numbers, record IDs, dates, sample IDs) when present.
- Do not name individuals; use titles. Do not name non-inspected firms except as "the firm" or as in the provided metadata.
- Output must be valid JSON only (no markdown fences), matching the exact keys requested in the user message."""

# Shown in the human message for generate_observations — aligned with evaluation substring checks on evidence_list.
FORM_483_STRICT_EVIDENCE_BLOCK = """You are generating FDA Form 483 observations with STRICT evidence grounding.

CRITICAL RULE (NON-NEGOTIABLE):
The "evidence_list" MUST contain ONLY exact verbatim substrings copied from the RAW INSPECTION NOTES.

DO NOT:
- Paraphrase
- Summarize
- Rewrite into regulatory language
- Fix grammar or OCR errors
- Combine multiple phrases
- Add any words not present in the source

DO:
- Copy text EXACTLY as it appears in RAW INSPECTION NOTES
- Preserve original wording, spacing, and order
- Use short contiguous phrases (not long sentences)
- Prefer multiple short quotes instead of one long sentence

VALIDATION REQUIREMENT (MANDATORY):
Before returning output, you MUST verify:

For EACH evidence bullet:
- It exists as a contiguous substring in RAW INSPECTION NOTES
- It can be found using Ctrl+F (case-insensitive)

If ANY bullet cannot be found EXACTLY:
→ DISCARD and REPLACE it with a valid substring

source_notes_excerpt must also be a contiguous substring of RAW INSPECTION NOTES (verbatim copy for traceability).

GOOD EXAMPLE:

RAW NOTES:
"Batch record not reviewed by QA before release. Operator skipped verification step."

VALID evidence_list:
- "Batch record not reviewed by QA before release"
- "Operator skipped verification step"

BAD EXAMPLES (DO NOT DO THIS):

❌ "QA did not review batch records prior to release"
(paraphrased)

❌ "Batch record not reviewed and verification skipped"
(combined phrases)

❌ "Batch record not reviewed by QA before release."
(punctuation change may break substring match)

IMPORTANT:
- evidence_list is NOT for writing quality — it is for EXACT TRACEABILITY
- Treat this as a COPY-EXTRACTION task, not a writing task
- observation_text can be clean and professional, but evidence_list must be RAW"""

SYSTEM_PROMPT = """You are an expert FDA investigator assistant trained on the Investigations Operations Manual (IOM) and Title 21 CFR. Your role is to help draft Form FDA 483 inspectional observations from raw inspection notes.

CRITICAL RULES:
1. Every observation must answer: Who, What, When, Where, Why, How Much/Often
2. Apply the "So What?" test — state WHY the condition is significant
3. Use factual, objective language — no conclusions, no legal determinations
4. Cite specific evidence: lot numbers, record numbers, counts (e.g., "3 of 10 records reviewed")
5. Do NOT name individuals by name — use titles (e.g., "QC Manager", "Analyst A")
6. Do NOT name supplier/consignee firms — use "Firm A", "Firm B"
7. Do NOT cite FDA guidance documents or policy — only cite 21 CFR regulations
8. Use present tense for conditions that are ongoing
9. **One observation per distinct 21 CFR regulatory basis** (section/subsection). If multiple findings in the notes support the **same** CFR section, **combine** them into a **single** observation: one `cfr_citation`, merged `evidence_list`, and `observation_text` that covers all related facts. Do **not** output separate rows that duplicate the same citation.
10. Format: Lead with the regulatory deficiency statement, then provide supporting evidence/examples.
11. **Strict evidence (non-negotiable):** The user message repeats mandatory rules: each `evidence_list` string MUST be an exact contiguous substring from the RAW INSPECTION NOTES (same characters as in the notes; the app verifies substring match). Do not paraphrase evidence. `observation_text` may be formal FDA style; `evidence_list` is copy-extraction only.
12. **source_notes_excerpt:** Must be a contiguous verbatim substring from the raw notes (shortest excerpt that supports the observation).
13. **Anti-hallucination:** If the notes are silent on a topic, do not fabricate observations for it. When a required output count **N** is given, produce **exactly N** observations, each grounded in the notes—never pad with invented content.
14. **CFR citations:** Cite only **21 CFR** regulations that genuinely apply to the described facts in the notes; use clear subsection references where appropriate."""


class AIService:
    def __init__(
        self,
        provider: str = "google",
        api_key: str = "",
        google_api_key: str = "",
        model: str = "gpt-4o",
        google_model: str = "gemini-2.0-flash",
        temperature: float = 0.1,
        openai_base_url: str | None = None,
    ):
        self.provider = provider
        self.api_key = api_key
        self.google_api_key = google_api_key
        self.model = model
        self.google_model = google_model
        self.temperature = temperature
        self.openai_base_url = (openai_base_url or "").strip() or None
        self._llm = None

    def _get_llm(self):
        if self._llm is not None:
            return self._llm

        if self.provider == "google":
            if not self.google_api_key:
                raise RuntimeError("Google API key not configured. Set GOOGLE_API_KEY in the repository root `.env`")
            from langchain_google_genai import ChatGoogleGenerativeAI
            self._llm = ChatGoogleGenerativeAI(
                model=self.google_model,
                google_api_key=self.google_api_key,
                temperature=self.temperature,
            )
        else:
            if not self.api_key:
                raise RuntimeError(
                    "OpenAI API key not configured. Set OPENAI_API_KEY or OPENAI_ROUTER_API_KEY in the repository root `.env`"
                )
            from langchain_openai import ChatOpenAI

            kw = {
                "api_key": self.api_key,
                "model": self.model,
                "temperature": self.temperature,
            }
            if self.openai_base_url:
                kw["base_url"] = self.openai_base_url
            self._llm = ChatOpenAI(**kw)
        return self._llm

    def _get_llm_draft_single_obs(self):
        """
        One observation per call: deterministic sampling + JSON object output (OpenAI json_object; Gemini MIME when supported).
        """
        if self.provider == "google":
            if not self.google_api_key:
                raise RuntimeError("Google API key not configured. Set GOOGLE_API_KEY in the repository root `.env`")
            from langchain_google_genai import ChatGoogleGenerativeAI

            try:
                return ChatGoogleGenerativeAI(
                    model=self.google_model,
                    google_api_key=self.google_api_key,
                    temperature=0,
                    top_p=0.1,
                    model_kwargs={"response_mime_type": "application/json"},
                )
            except TypeError:
                return ChatGoogleGenerativeAI(
                    model=self.google_model,
                    google_api_key=self.google_api_key,
                    temperature=0,
                    top_p=0.1,
                )
        if not self.api_key:
            raise RuntimeError(
                "OpenAI API key not configured. Set OPENAI_API_KEY or OPENAI_ROUTER_API_KEY in the repository root `.env`"
            )
        from langchain_openai import ChatOpenAI

        kw = {
            "api_key": self.api_key,
            "model": self.model,
            "temperature": 0,
            "top_p": 0.1,
            "model_kwargs": {"response_format": {"type": "json_object"}},
        }
        if self.openai_base_url:
            kw["base_url"] = self.openai_base_url
        return ChatOpenAI(**kw)

    @staticmethod
    def _llm_text(response) -> str:
        """Normalize LangChain AIMessage content (Gemini often returns list blocks, not a plain string)."""
        c = getattr(response, "content", None)
        if c is None:
            return ""
        if isinstance(c, str):
            return c
        if isinstance(c, list):
            parts: list[str] = []
            for block in c:
                if isinstance(block, str):
                    parts.append(block)
                elif isinstance(block, dict):
                    parts.append(str(block.get("text", "") or ""))
                else:
                    parts.append(str(block))
            return "".join(parts)
        return str(c)

    @staticmethod
    def _metadata_str_fields() -> tuple[str, ...]:
        return (
            "firm_name",
            "fei_number",
            "street_address",
            "city",
            "state",
            "zip_code",
            "country",
            "establishment_type",
            "inspection_start",
            "inspection_end",
            "district_office",
            "report_issued_to_name",
            "report_issued_to_title",
        )

    def _sanitize_metadata_payload(self, payload: dict) -> dict:
        """LLMs may emit JSON null; Pydantic str fields reject None."""
        out = dict(payload)
        for key in self._metadata_str_fields():
            val = out.get(key)
            out[key] = "" if val is None else str(val)
        return out

    def estimate_observation_count(self, raw_notes: str, establishment_type: str) -> dict[str, Any]:
        """
        First pipeline stage: estimate how many distinct inspectional issues the OCR/raw notes support.
        Used to constrain drafting to the same count with clear per-issue CFR citations.
        """
        notes = (raw_notes or "").strip()
        if len(notes) < _MIN_NOTES_LEN_FOR_COUNT_ESTIMATE:
            return {
                "count": 1,
                "rationale": "Very short notes; treated as a single inspectional scope.",
            }

        truncated = notes[:_MAX_NOTES_FOR_COUNT_ESTIMATE]
        llm = self._get_llm()
        try:
            est_llm = llm.bind(temperature=0.1)
        except Exception:
            est_llm = llm

        human = f"""How many distinct inspectional issues does the following text support for a Form FDA 483 at a {establishment_type} establishment?

Count **after** grouping by regulatory basis: if several findings would map to the **same primary 21 CFR section** (e.g. 21 CFR 211.100), count them as **one** issue (one drafted observation will combine them).

Return ONLY valid JSON with this exact shape:
{{"count": <integer 1-{_MAX_ISSUE_COUNT_ESTIMATE}>, "rationale": "<2-4 sentences: what you counted and why>"}}

RAW INSPECTION NOTES:
{truncated}
"""

        try:
            response = est_llm.invoke(
                [
                    SystemMessage(content=ESTIMATE_OBSERVATION_COUNT_SYSTEM),
                    HumanMessage(content=human),
                ]
            )
            text = self._llm_text(response)
            obj = _parse_eir_json_from_llm_reply(text)
            if not obj:
                raise ValueError("no json object")
            raw_count = obj.get("count")
            if raw_count is None:
                raise ValueError("count missing")
            count = int(raw_count)
            rationale = str(obj.get("rationale", "") or "").strip()
        except Exception:
            logger.warning("estimate_observation_count failed", exc_info=True)
            return {
                "count": None,
                "rationale": "Automatic issue-count estimation failed; draft count not constrained.",
            }

        count = max(1, min(_MAX_ISSUE_COUNT_ESTIMATE, count))
        if not rationale:
            rationale = "Estimated distinct issues from the notes."
        return {"count": count, "rationale": rationale}

    def generate_observations(
        self,
        raw_notes: str,
        establishment_type: str,
        cfr_parts: list[str],
        kb_context: list[str] = None,
        example_483: str = "",
        skip_count_estimate: bool = False,
        refinement_feedback: str | None = None,
    ) -> tuple[list[DraftObservation], dict[str, Any]]:
        """Legacy: single multi-observation LLM pass from raw notes (not used by POST /api/ai/generate-observations).

        Prefer: ``segment_observations`` → ``draft_observations`` (per-row drafting).
        """
        llm = self._get_llm()

        kb_text = "\n---\n".join(kb_context or [])
        cfr_text = ", ".join(cfr_parts) if cfr_parts else "applicable 21 CFR parts"
        notes_for_prompt = (raw_notes or "")[:_MAX_RAW_NOTES_FOR_483]
        if len(raw_notes or "") > _MAX_RAW_NOTES_FOR_483:
            logger.info(
                "Raw notes truncated for 483 generation: %s -> %s chars",
                len(raw_notes or ""),
                _MAX_RAW_NOTES_FOR_483,
            )

        meta: dict[str, Any] = {
            "expected_observation_count": None,
            "observation_count_rationale": None,
            "count_matches_expectation": None,
            "drafted_observation_count": 0,
        }
        if not skip_count_estimate:
            est_raw = self.estimate_observation_count(raw_notes, establishment_type)
            meta["expected_observation_count"] = est_raw.get("count")
            meta["observation_count_rationale"] = est_raw.get("rationale")

        expected = meta.get("expected_observation_count")
        if isinstance(expected, int) and expected > 0:
            count_block = (
                f"\n\n**Issue count (required):** Prior analysis supports **exactly {expected}** distinct inspectional "
                "issues (counting findings that share the same primary 21 CFR section as **one** issue). "
                f"Return a JSON array with **exactly {expected}** objects—no more, no fewer. "
                "**Do not** output two rows for the same 21 CFR section basis—merge those findings into one object. "
                "Ground **every** fact, number, and evidence string in the RAW INSPECTION NOTES only (no hallucination). "
                "Each object must include `cfr_citation`, `evidence_list`, and `source_notes_excerpt`.\n"
            )
            tail = "Return ONLY valid JSON array matching the format above."
        else:
            count_block = ""
            tail = (
                "Generate **one observation per distinct inspectional issue**, and **one row per distinct 21 CFR section "
                "basis**—combine findings that share the same citation into a single observation. Typically 1–20 items "
                "when the notes describe many findings. Ground everything in the notes; do not invent deficiencies. "
                "Return ONLY valid JSON."
            )

        rf = (refinement_feedback or "").strip()
        optional_refinement = ""
        if rf:
            optional_refinement = (
                "\n\nOPTIONAL REFINEMENT FEEDBACK:\n"
                f"{rf[:8000]}\n"
                "\nAddress this feedback without adding facts not present in RAW INSPECTION NOTES; "
                "replace any non-verbatim evidence_list entries with exact substrings from the notes.\n"
            )

        user_prompt = f"""{FORM_483_STRICT_EVIDENCE_BLOCK}

---

Establishment: {establishment_type} facility. Notes may include OCR merged from uploads plus typed notes — use **only** this material for evidence_list and source_notes_excerpt.

Applicable CFR parts: {cfr_text}

RELEVANT IOM REGULATORY GUIDANCE:
{kb_text[:3000] if kb_text else "No additional guidance available."}

{f"EXAMPLE OF A WELL-WRITTEN 483 (for reference only — do NOT copy its evidence style if it paraphrases; evidence_list must still be verbatim from RAW INSPECTION NOTES below):{chr(10)}{example_483[:2000]}" if example_483 else ""}

INPUT:
RAW INSPECTION NOTES:
{notes_for_prompt}
{count_block}{optional_refinement}

Now generate observations ensuring ALL evidence bullets strictly follow the rules.

Generate observations in this JSON format (return a JSON array):
[
  {{
    "observation_text": "The firm's [specific deficiency]...",
    "cfr_citation": "21 CFR XXX.XX",
    "evidence_list": ["exact copied phrase from notes", "another exact phrase"],
    "source_notes_excerpt": "verbatim contiguous substring from raw notes",
    "review_flags": ["any concerns for human reviewer"]
  }}
]

{tail}"""

        response = llm.invoke(
            [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ]
        )

        observations = self._parse_observations_response(self._llm_text(response), raw_notes, notes_for_prompt)
        observations = merge_duplicate_cfr_observations(observations)
        canon = (notes_for_prompt if notes_for_prompt is not None else raw_notes) or ""
        for obs in observations:
            ex = (obs.source_notes_excerpt or "").strip()
            if ex and canon and not _source_excerpt_matches_raw_notes(ex, canon):
                if REVIEW_FLAG_SOURCE_EXCERPT_MISMATCH not in (obs.review_flags or []):
                    obs.review_flags = list(obs.review_flags or []) + [REVIEW_FLAG_SOURCE_EXCERPT_MISMATCH]

        meta["drafted_observation_count"] = len(observations)

        if isinstance(expected, int) and expected > 0:
            meta["count_matches_expectation"] = len(observations) == expected
            if not meta["count_matches_expectation"]:
                for obs in observations:
                    obs.review_flags = list(obs.review_flags) + [REVIEW_FLAG_COUNT_MISMATCH]
        else:
            meta["count_matches_expectation"] = None

        return observations, meta

    def extract_inspection_metadata(self, raw_text: str) -> InspectionMetadata:
        """Extract inspection metadata fields from OCR/raw company details."""
        text = (raw_text or "").strip()
        if len(text) < 20:
            raise RuntimeError(
                "Not enough text was extracted from the file for metadata extraction. "
                "Try a clearer PDF or image, or ensure Tesseract OCR is installed on the server for scanned documents."
            )
        llm = self._get_llm()
        prompt = f"""Extract structured FDA inspection metadata from this document text.

Return ONLY valid JSON matching this exact shape:
{{
  "firm_name": "",
  "fei_number": "",
  "street_address": "",
  "city": "",
  "state": "",
  "zip_code": "",
  "country": "United States",
  "establishment_type": "",
  "inspection_start": "",
  "inspection_end": "",
  "district_office": "",
  "investigators": [{{"name": "", "title": ""}}],
  "report_issued_to_name": "",
  "report_issued_to_title": ""
}}

Rules:
- Keep unknown fields as empty string.
- FEI should contain only digits.
- Dates should be in YYYY-MM-DD when present.
- investigators should be an array (can be empty).

SOURCE TEXT:
{text[:12000]}
"""
        response = llm.invoke(
            [
                SystemMessage(content="You extract structured regulatory metadata accurately from document text."),
                HumanMessage(content=prompt),
            ]
        )

        import json

        reply = self._llm_text(response)
        try:
            match = re.search(r"\{.*\}", reply, re.DOTALL)
            if match:
                payload = json.loads(match.group(0))
                payload = self._sanitize_metadata_payload(payload)
                # Normalize FEI digits and guard investigator shape.
                payload["fei_number"] = re.sub(r"\D+", "", str(payload.get("fei_number", "")))
                investigators = payload.get("investigators", [])
                if not isinstance(investigators, list):
                    investigators = []
                payload["investigators"] = [
                    {"name": str(inv.get("name", "")).strip(), "title": str(inv.get("title", "")).strip()}
                    for inv in investigators
                    if isinstance(inv, dict)
                ]
                return InspectionMetadata(**payload)
        except Exception:
            logger.warning("Metadata extraction parse failed; using fallback parser", exc_info=True)

        # Fallback regex extraction for key fields.
        fei_match = re.search(r"\b(\d{7,10})\b", text)
        date_matches = re.findall(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", text)
        return InspectionMetadata(
            fei_number=fei_match.group(1) if fei_match else "",
            inspection_start=date_matches[0] if len(date_matches) > 0 else "",
            inspection_end=date_matches[1] if len(date_matches) > 1 else "",
        )
    
    def _parse_observations_response(
        self, content: str, raw_notes: str, notes_used_in_prompt: str | None = None,
    ) -> list[DraftObservation]:
        """Parse LLM response into DraftObservation objects."""
        import json

        canonical_notes = (notes_used_in_prompt if notes_used_in_prompt is not None else raw_notes) or ""

        json_match = re.search(r'\[.*\]', content, re.DOTALL)
        if not json_match:
            logger.warning("Could not parse JSON from LLM response, creating single observation")
            return [DraftObservation(
                id=str(uuid.uuid4())[:8],
                observation_text=content.strip(),
                cfr_citation="",
                evidence_list=[],
                confidence_score=0.5,
                source_notes_excerpt=raw_notes[:200],
                review_flags=["Could not parse structured response - manual review required"],
            )]
        
        try:
            items = json.loads(json_match.group())
        except json.JSONDecodeError:
            return [DraftObservation(
                id=str(uuid.uuid4())[:8],
                observation_text=content.strip(),
                cfr_citation="",
                confidence_score=0.4,
                review_flags=["JSON parse error - manual review required"],
            )]
        
        observations = []
        for item in items:
            flags = list(item.get("review_flags") or [])
            if not isinstance(flags, list):
                flags = []
            excerpt = (item.get("source_notes_excerpt") or "").strip()
            if excerpt and canonical_notes and not _source_excerpt_matches_raw_notes(excerpt, canonical_notes):
                flags.append(REVIEW_FLAG_SOURCE_EXCERPT_MISMATCH)

            obs = DraftObservation(
                id=str(uuid.uuid4())[:8],
                observation_text=item.get("observation_text", ""),
                cfr_citation=item.get("cfr_citation", ""),
                evidence_list=item.get("evidence_list", []),
                confidence_score=self._score_observation(item.get("observation_text", "")),
                source_notes_excerpt=excerpt,
                review_flags=flags,
            )
            observations.append(obs)

        return observations
    
    def _score_observation(self, text: str) -> float:
        """Heuristic confidence scoring."""
        score = 0.5
        if any(w in text.lower() for w in ["specifically", "reviewed", "observed"]):
            score += 0.1
        if re.search(r'\d+ of \d+', text):
            score += 0.1
        if re.search(r'21 CFR', text):
            score += 0.1
        if len(text) > 200:
            score += 0.1
        if any(w in text.lower() for w in ["manager", "analyst", "operator", "supervisor"]):
            score += 0.05
        return min(score, 1.0)
    
    def generate_eir_narrative(
        self,
        observations: list[DraftObservation],
        inspection_metadata: dict,
        raw_notes: str = "",
        kb_context: Optional[list[str]] = None,
    ) -> EIRNarrative:
        """Generate EIR narrative sections (IOM-aligned outline; CFR/IOM-informed)."""
        llm = self._get_llm()

        obs_lines = []
        for i, o in enumerate(observations, start=1):
            ev = "; ".join(e for e in (o.evidence_list or []) if (e or "").strip())
            obs_lines.append(
                f"--- Observation {i} ---\n"
                f"Text: {o.observation_text}\n"
                f"CFR: {o.cfr_citation}\n"
                f"Evidence list: {ev}\n"
                f"Source notes excerpt: {o.source_notes_excerpt}\n"
            )
        obs_text = "\n".join(obs_lines) if obs_lines else "(No structured observations provided.)"
        meta = inspection_metadata

        kb_text = "\n---\n".join(kb_context or [])[:6000]
        if not kb_text.strip():
            kb_text = "No additional knowledge-base excerpts."

        user_prompt = f"""Draft the **Establishment Inspection Report (EIR) narrative** for the inspection below.

FIRM METADATA:
- Firm: {meta.get('firm_name', 'Unknown')}
- FEI: {meta.get('fei_number', '')}
- Address: {meta.get('street_address', '')}, {meta.get('city', '')}, {meta.get('state', '')} {meta.get('zip_code', '')}
- Inspection dates: {meta.get('inspection_start', '')} to {meta.get('inspection_end', '')}
- District: {meta.get('district_office', '')}
- Establishment type: {meta.get('establishment_type', '')}

DRAFT FORM FDA 483 OBSERVATIONS (authoritative list — narrative must align):
{obs_text}

RAW INSPECTION NOTES / EXTRACTS (tables, checklist text, free text):
{raw_notes[:12000]}

SUPPLEMENTAL REGULATORY CONTEXT (excerpts; use only to support wording — do not contradict observations above):
{kb_text}

Return a single JSON **object** using **exactly these snake_case keys** (all string values). Every key must be present. Do not use camelCase.
Do not leave long-form narrative fields empty: sections observations_summary through references_and_citations must each contain at least one substantive paragraph or bullet list drawn from the observations and notes.
{{
  "cover_info": "",
  "purpose_scope": "",
  "regulatory_framework": "",
  "background_scope": "",
  "inspection_methodology": "",
  "observations_summary": "Discussion of findings: tie each observation to 21 CFR and evidence.",
  "evidence_descriptions": "Records, lots, logs, samples, and other objective evidence.",
  "chronological_account": "Sequence of significant inspection activities.",
  "references_and_citations": "21 CFR list and IOM references as appropriate."
}}

Return ONLY valid JSON (markdown code fences optional)."""

        response = llm.invoke(
            [
                SystemMessage(content=EIR_SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ]
        )

        reply = self._llm_text(response)

        narrative: EIRNarrative | None = None
        data = _parse_eir_json_from_llm_reply(reply)
        if data:
            try:
                coerced = _coerce_eir_dict(data)
                narrative = EIRNarrative.model_validate(coerced)
            except Exception as e:
                logger.warning("EIR model_validate failed: %s", e, exc_info=True)
        if narrative is None:
            logger.warning("EIR JSON not parsed; using fallback narrative body")
            narrative = EIRNarrative(observations_summary=reply)

        return _fill_empty_eir_sections(narrative, observations)

    def generate_eir_pipeline_narrative(
        self,
        observations: list[DraftObservation],
        inspection_metadata: dict,
        raw_notes: str = "",
        kb_context: Optional[list[str]] = None,
        strict_eir_coverage: bool = False,
    ) -> EIRPipelineNarrative:
        """EIR generation for post–483 workflow: narrative + traceability; enforces full 483 observation coverage."""
        ensure_observation_ids(observations)
        validate_observations_for_eir(observations)

        llm = self._get_llm()
        n_in = len(observations)
        obs_ids = [(o.id or "").strip() for o in observations]

        obs_lines = []
        for i, o in enumerate(observations, start=1):
            ev = "; ".join(e for e in (o.evidence_list or []) if (e or "").strip())
            obs_lines.append(
                f"--- Form FDA 483 observation {i} (observation_id={o.id}) ---\n"
                f"Text: {o.observation_text}\n"
                f"CFR: {o.cfr_citation}\n"
                f"Evidence list: {ev}\n"
                f"Source notes excerpt: {o.source_notes_excerpt}\n"
            )
        obs_text = "\n".join(obs_lines) if obs_lines else "(No structured observations provided.)"
        meta = inspection_metadata
        strict_addon = build_eir_pipeline_strict_addon(n_in, obs_ids)

        kb_text = "\n---\n".join(kb_context or [])[:6000]
        if not kb_text.strip():
            kb_text = "No additional knowledge-base excerpts."

        user_prompt = f"""Produce the **Establishment Inspection Report (EIR)** narrative sections below. Form FDA 483 has already been issued; this EIR must **reference and expand** those observations with narrative context, evidence description, and compliance discussion.

FIRM / INSPECTION METADATA:
- Firm: {meta.get('firm_name', 'Unknown')}
- FEI: {meta.get('fei_number', '')}
- Address: {meta.get('street_address', '')}, {meta.get('city', '')}, {meta.get('state', '')} {meta.get('zip_code', '')}
- Inspection dates: {meta.get('inspection_start', '')} to {meta.get('inspection_end', '')}
- District: {meta.get('district_office', '')}
- Establishment type: {meta.get('establishment_type', '')}

AUTHORITATIVE FORM FDA 483 OBSERVATIONS (expand these in narrative; do not contradict):
{obs_text}

RAW INSPECTION NOTES / OCR / SUPPORTING TEXT:
{raw_notes[:12000]}

SUPPLEMENTAL REGULATORY CONTEXT (support wording only):
{kb_text}
{strict_addon}

Return a single JSON **object** with **exactly these snake_case keys** (all string values except `traceability` which is an array):
- cover_info, purpose_scope, regulatory_framework, background_scope, inspection_methodology
- observations_summary: narrative discussion tying **each** 483 observation to findings; include every observation_id.
- evidence_descriptions: objective evidence (records, samples, dates) linked to observations.
- chronological_account: significant inspection activity sequence.
- references_and_citations: 21 CFR and other citations as appropriate.
- traceability: array of objects, **exactly {n_in} entries**, **one per 483 observation**, each with:
  - observation_index (1-based int), observation_id (string — must match input), cfr_citation (string)
  - evidence_sources (array of strings — specific evidence refs)
  - compliance_discussion (string — narrative paragraph for that observation only)

Return ONLY valid JSON (markdown fences optional)."""

        missing_trace: list[str] = []
        missing_text: list[str] = []
        reply = ""
        pipe: EIRPipelineNarrative | None = None

        for attempt in range(2):
            retry_suffix = ""
            if attempt > 0 and (missing_trace or missing_text):
                retry_suffix = "\n\n" + build_eir_retry_prompt(missing_trace, missing_text)

            response = llm.invoke(
                [
                    SystemMessage(content=EIR_PIPELINE_SYSTEM_PROMPT),
                    HumanMessage(content=user_prompt + retry_suffix),
                ]
            )
            reply = self._llm_text(response)
            data = _parse_eir_json_from_llm_reply(reply)
            narrative: EIRPipelineNarrative | None = None
            if data:
                try:
                    narrative = EIRPipelineNarrative.model_validate(_coerce_eir_pipeline_dict(data))
                except Exception as e:
                    logger.warning("EIR pipeline model_validate failed: %s", e, exc_info=True)
                    narrative = None
            if narrative is None:
                narrative = EIRPipelineNarrative(observations_summary=reply)

            base = EIRNarrative.model_validate(narrative.model_dump(exclude={"traceability"}))
            filled = _fill_empty_eir_sections(base, observations)
            trace_list = list(narrative.traceability or [])
            merged = {**filled.model_dump(), "traceability": trace_list}
            pipe = EIRPipelineNarrative.model_validate(merged)

            ok, missing_trace, missing_text = validate_eir_pipeline_coverage(pipe, observations)
            if ok:
                break

        if pipe is None:
            raise RuntimeError("EIR pipeline failed to produce a narrative")

        ok, missing_trace, missing_text = validate_eir_pipeline_coverage(pipe, observations)
        llm_missing = sorted(set(missing_trace) | set(missing_text))

        if not ok and strict_eir_coverage:
            raise ValueError(
                f"EIR generation failed coverage validation: expected {n_in} observations in traceability and narrative. "
                f"Missing from traceability: {missing_trace}. Missing ids in narrative text: {missing_text}."
            )

        recovered = False
        if not ok:
            pipe = synthesize_missing_pipeline_coverage(pipe, observations, missing_trace, missing_text)
            recovered = True
            ok, _, _ = validate_eir_pipeline_coverage(pipe, observations)

        extras = {
            "coverage": 1.0 if n_in else 0.0,
            "eir_total_observations": n_in,
            "eir_observations_included": n_in,
            "observation_coverage_valid": not recovered,
            "missing_observation_ids": [],
            "eir_coverage_recovered": recovered,
            "eir_llm_missing_observation_ids": llm_missing if recovered else [],
        }
        return pipe.model_copy(update=extras)

    def refine_observation(self, observation: DraftObservation, feedback: str) -> DraftObservation:
        """Refine an observation based on user feedback."""
        llm = self._get_llm()
        
        response = llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"""Refine this FDA 483 observation based on the reviewer's feedback.

CURRENT OBSERVATION:
{observation.observation_text}

CFR Citation: {observation.cfr_citation}

REVIEWER FEEDBACK:
{feedback}

Return the improved observation text only (no JSON, no explanation)."""),
        ])
        
        observation.observation_text = self._llm_text(response).strip()
        observation.review_flags = ["Refined based on feedback"]
        return observation
    
    def validate_observation(self, observation: DraftObservation) -> ValidationResult:
        """Validate a draft observation against FDA requirements."""
        issues = []
        suggestions = []
        
        text = observation.observation_text
        
        if not re.search(r'21 CFR \d+\.\d+', observation.cfr_citation):
            issues.append("CFR citation format should be '21 CFR XXX.XX'")
        
        if not text or len(text) < 50:
            issues.append("Observation text is too short")
        
        name_patterns = [r'\b[A-Z][a-z]+ [A-Z][a-z]+\b']
        for p in name_patterns:
            if re.search(p, text) and not any(t in text for t in ["Firm A", "Firm B", "Analyst A"]):
                suggestions.append("Check: possible individual name found. Use titles instead.")
        
        if not re.search(r'\d+ (of|out of) \d+', text):
            suggestions.append("Consider adding population ratio (e.g., '3 of 10 records reviewed')")
        
        required_elements = {
            "what": bool(re.search(r'(observed|noted|found|reviewed|determined)', text.lower())),
            "when": bool(re.search(r'(on |during |between |dated |\d{1,2}/\d{1,2}/\d{2,4})', text.lower())),
            "evidence": bool(re.search(r'(record|batch|lot|document|report|log)', text.lower())),
        }
        
        for element, found in required_elements.items():
            if not found:
                suggestions.append(f"Consider adding '{element}' detail to the observation")
        
        return ValidationResult(
            is_valid=len(issues) == 0,
            issues=issues,
            suggestions=suggestions,
        )

    async def draft_single_observation(self, obs: ObservationInput) -> ObservationOutput:
        """Single LLM call per input row; JSON with drafted_text, evidence_used, cfr_citation."""
        from app.config import settings
        from app.services.draft_483_pipeline import (
            DRAFT_483_SYSTEM_PROMPT,
            build_draft_483_prompt,
            parse_draft_483_json,
        )
        from app.services.prompt_builders import build_observation_prompt

        llm = self._get_llm_draft_single_obs()
        base_prompt = build_draft_483_prompt(obs)
        em = (obs.evidence_mode or settings.evidence_mode or "balanced").strip().lower()
        user_prompt = build_observation_prompt(
            base_user_prompt=base_prompt,
            retrieved_context=obs.retrieval_context or "",
            evidence_mode=em,
            use_retrieved_evidence_only=bool((obs.retrieval_context or "").strip()),
        )
        response = await llm.ainvoke(
            [
                SystemMessage(content=DRAFT_483_SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ]
        )
        text = self._llm_text(response)
        parsed = parse_draft_483_json(text)
        if not parsed:
            raise ValueError("Failed to parse JSON from LLM response for draft-483")

        drafted_text = str(parsed.get("drafted_text", "") or "").strip()
        raw_ev = parsed.get("evidence_used")
        if isinstance(raw_ev, list):
            evidence_used = [str(x).strip() for x in raw_ev if str(x).strip()]
        else:
            evidence_used = []

        source_text = obs.raw_text or ""
        if obs.evidence:
            source_text += " " + " ".join(obs.evidence)
        if obs.retrieval_context:
            source_text += " " + obs.retrieval_context

        grounding_types: list[str] = []
        try:
            from app.services.evidence_postprocess import fix_evidence_list
            evidence_used, grounding_types = fix_evidence_list(
                evidence_used, source_text, max_items=5,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                "fix_evidence_list failed for obs %s (using original evidence): %s",
                obs.obs_id, e,
            )

        cc = parsed.get("cfr_citation")
        cfr_citation: str | None
        if cc is None or (isinstance(cc, str) and not cc.strip()):
            cfr_citation = None
        else:
            cfr_citation = str(cc).strip() or None

        return ObservationOutput(
            obs_id=obs.obs_id,
            drafted_text=drafted_text,
            evidence_used=evidence_used,
            cfr_citation=cfr_citation,
            evidence_grounding_types=grounding_types,
        )

    async def draft_observations(self, observations: list[ObservationInput]) -> list[ObservationOutput]:
        """Sequential one-observation-per-call pipeline with hard count guard."""
        results: list[ObservationOutput] = []
        for obs in observations:
            drafted = await self.draft_single_observation(obs)
            results.append(drafted)
        if len(results) != len(observations):
            raise ValueError("❌ Observation count mismatch — pipeline violation")
        return results

    async def segment_observations(
        self, raw_text: str, refinement_feedback: str | None = None
    ) -> list[SegmentedObservation]:
        """LLM: split raw inspection notes into distinct single-issue rows (no 483 drafting here)."""
        from app.services.draft_483_pipeline import SEGMENTATION_SYSTEM_PROMPT, parse_segmentation_json

        text = (raw_text or "").strip()
        if not text:
            raise ValueError("raw_text is required")

        llm = self._get_llm_draft_single_obs()
        user_msg = f"RAW NOTES:\n{raw_text}"
        rf = (refinement_feedback or "").strip()
        if rf:
            user_msg += (
                "\n\nPRIOR REVIEWER NOTES (use only to split or label issues; do not invent facts):\n"
                f"{rf[:8000]}"
            )
        response = await llm.ainvoke(
            [
                SystemMessage(content=SEGMENTATION_SYSTEM_PROMPT),
                HumanMessage(content=user_msg),
            ]
        )
        parsed = parse_segmentation_json(self._llm_text(response))
        if not parsed:
            raise ValueError("Failed to parse segmentation JSON from LLM response")

        items = parsed.get("observations") or []
        observations: list[SegmentedObservation] = []
        for i, item in enumerate(items):
            if not isinstance(item, dict):
                continue
            rt = str(item.get("raw_text", "") or "").strip()
            raw_ev = item.get("evidence", [])
            if not isinstance(raw_ev, list):
                raw_ev = []
            ev_list = [str(x).strip() for x in raw_ev if str(x).strip()]
            observations.append(
                SegmentedObservation(
                    obs_id=f"OBS_{i + 1}",
                    raw_text=rt,
                    evidence=ev_list,
                )
            )

        if not observations:
            raise ValueError("❌ No observations extracted")

        return observations
