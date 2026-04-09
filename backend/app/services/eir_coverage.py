"""
EIR generation: full observation coverage, traceability validation, and recovery helpers.

Does not modify OCR or citation matching — only validates structure and enforces 483→EIR alignment.
"""

from __future__ import annotations

import re
import uuid
from typing import TYPE_CHECKING

from app.schemas.inspection import (
    DraftObservation,
    EIRObservationAtomic,
    EIRNarrative,
    EIRPipelineNarrative,
    EIRPipelineObservationLink,
)

if TYPE_CHECKING:
    pass


def ensure_observation_ids(observations: list[DraftObservation]) -> None:
    """Ensure every draft row has a stable id for traceability."""
    for o in observations:
        if not (o.id or "").strip():
            o.id = str(uuid.uuid4())[:8]


def draft_observations_to_atomic_list(observations: list[DraftObservation]) -> list[EIRObservationAtomic]:
    """Map API DraftObservation rows to atomic EIR validation units."""
    ensure_observation_ids(observations)
    out: list[EIRObservationAtomic] = []
    for o in observations:
        cfr = (o.cfr_citation or "").strip()
        out.append(
            EIRObservationAtomic(
                observation_id=(o.id or "").strip(),
                raw_text=o.observation_text or "",
                citations=[cfr] if cfr else [],
                evidence=list(o.evidence_list or []),
                source_reference=(o.source_notes_excerpt or "").strip() or None,
            )
        )
    return out


def validate_observations_for_eir(observations: list[DraftObservation]) -> None:
    """Pre-LLM validation: atomic observations must have text and at least one CFR citation."""
    if not observations:
        raise ValueError("No observations found")
    for obs in observations:
        oid = (obs.id or "").strip() or "(no id)"
        if not (obs.observation_text or "").strip():
            raise ValueError(f"Missing observation text for observation {oid}")
        if not (obs.cfr_citation or "").strip():
            raise ValueError(f"Missing CFR citation for observation {oid}")


def concatenate_eir_narrative_text(n: EIRNarrative) -> str:
    """All narrative fields for substring presence checks."""
    parts: list[str] = []
    for key in (
        "cover_info",
        "purpose_scope",
        "regulatory_framework",
        "background_scope",
        "inspection_methodology",
        "observations_summary",
        "evidence_descriptions",
        "chronological_account",
        "references_and_citations",
    ):
        parts.append(getattr(n, key, "") or "")
    return "\n".join(parts)


def count_observation_id_markers(text: str) -> int:
    """Count explicit 'Observation ID:' markers (optional LLM format)."""
    return len(re.findall(r"Observation\s+ID\s*:", text, re.IGNORECASE))


def find_missing_observation_ids_in_text(narrative_text: str, observation_ids: list[str]) -> list[str]:
    """IDs that do not appear anywhere in the combined narrative (substring match)."""
    missing: list[str] = []
    for oid in observation_ids:
        s = (oid or "").strip()
        if not s:
            continue
        if s not in narrative_text:
            missing.append(s)
    return missing


def validate_eir_pipeline_coverage(
    narrative: EIRPipelineNarrative,
    observations: list[DraftObservation],
) -> tuple[bool, list[str], list[str]]:
    """
    Returns (ok, missing_from_trace, missing_from_narrative_text).

    Full coverage: every input observation_id has a traceability row and appears in combined narrative text.
    """
    trace = list(narrative.traceability or [])
    expected_ids = [(o.id or "").strip() for o in observations if (o.id or "").strip()]
    exp_set = set(expected_ids)
    got_set = {(t.observation_id or "").strip() for t in trace if (t.observation_id or "").strip()}

    missing_trace = list(exp_set - got_set)

    combined = concatenate_eir_narrative_text(narrative)
    for t in trace:
        combined += "\n" + (t.compliance_discussion or "")
        combined += "\n" + (t.observation_id or "")
    missing_text = find_missing_observation_ids_in_text(combined, expected_ids)

    ok = (not missing_trace) and (not missing_text) and (exp_set <= got_set)
    return ok, missing_trace, missing_text


def synthesize_missing_pipeline_coverage(
    narrative: EIRPipelineNarrative,
    observations: list[DraftObservation],
    missing_trace_ids: list[str],
    missing_text_ids: list[str],
) -> EIRPipelineNarrative:
    """
    Append trace rows and narrative bullets so every observation id is represented (regulatory fallback).
    """
    trace = list(narrative.traceability or [])
    seen = {(t.observation_id or "").strip() for t in trace}

    for o in observations:
        oid = (o.id or "").strip()
        if not oid or oid in seen:
            continue
        idx = observations.index(o) + 1
        trace.append(
            EIRPipelineObservationLink(
                observation_index=idx,
                observation_id=oid,
                cfr_citation=o.cfr_citation or "",
                evidence_sources=list(o.evidence_list or [])[:24],
                compliance_discussion=(o.observation_text or "")[:8000],
            )
        )
        seen.add(oid)

    obs_sum = narrative.observations_summary or ""
    check_text = concatenate_eir_narrative_text(narrative) + obs_sum
    for t in trace:
        check_text += "\n" + (t.compliance_discussion or "")

    for oid in missing_text_ids:
        if oid in check_text:
            continue
        o = next((x for x in observations if (x.id or "").strip() == oid), None)
        if not o:
            continue
        obs_sum += (
            f"\n\n---\nObservation ID: {oid}\n"
            f"CFR Citation(s): {o.cfr_citation}\n"
            f"Narrative: {o.observation_text}\n"
        )

    dump = narrative.model_dump()
    dump["traceability"] = [t.model_dump() for t in trace]
    dump["observations_summary"] = obs_sum.strip()
    return EIRPipelineNarrative.model_validate(dump)


def build_eir_pipeline_strict_addon(expected_count: int, observation_ids: list[str]) -> str:
    """Appended to user prompt — mandatory coverage rules."""
    ids_line = ", ".join(f"`{x}`" for x in observation_ids if x)
    return f"""
STRICT COVERAGE (MANDATORY — REGULATORY):
- Input has **exactly {expected_count}** Form FDA 483 observations. You MUST preserve **100% coverage**.
- DO NOT merge, drop, or summarize away any observation. Each must remain traceable.
- `traceability` MUST contain **exactly {expected_count}** objects — one per observation, in the same order as listed.
- Each traceability object MUST use the exact `observation_id` from the input: {ids_line}
- Each `compliance_discussion` MUST be a substantive paragraph for that observation alone.
- In `observations_summary`, reference each observation_id at least once (by id or numbered cross-reference).
- OUTPUT IS INVALID if traceability length ≠ {expected_count} or any observation_id is missing.
"""


def build_eir_retry_prompt(missing_trace: list[str], missing_text: list[str]) -> str:
    return f"""Your previous JSON was REJECTED for incomplete coverage.

You MUST fix and return valid JSON only:
- Missing traceability rows for observation_id(s): {missing_trace or 'none'}
- These observation_id(s) did not appear in narrative text: {missing_text or 'none'}

Emit a full traceability array with one entry per observation and include every observation_id in observations_summary or evidence_descriptions.
"""
