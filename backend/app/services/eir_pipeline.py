"""
Strict 1:1 EIR section generation: one Establishment Inspection Report narrative block per Form FDA 483 observation.

Uses `app.services.llm_client.call_llm` (not a separate `llm` module).
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from app.schemas.inspection import DraftObservation
from app.services.llm_client import call_llm
from app.services.validators import compute_tp_score, validate_1to1_mapping

EIR_ONE_TO_ONE_SYSTEM = (
    "You are an FDA ORA investigator drafting EIR narrative text. "
    "Return ONLY a single JSON object (no markdown fences) with keys observation_id and eir_text."
)


def _parse_json_object(reply: str) -> dict[str, Any] | None:
    """Extract one JSON object from LLM output (same strategy as AIService)."""
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


@dataclass
class Observation:
    """One atomic 483 row for strict EIR mapping (mirrors DraftObservation fields)."""

    id: str
    text: str
    evidence: list[str]
    citation: str


def observation_from_draft(o: DraftObservation, fallback_index: int) -> Observation:
    oid = (o.id or "").strip() or str(fallback_index)
    return Observation(
        id=oid,
        text=o.observation_text or "",
        evidence=list(o.evidence_list or []),
        citation=o.cfr_citation or "",
    )


def generate_eir_section(obs: Observation) -> dict[str, Any]:
    """Generate ONE EIR section for ONE observation. Returns parsed dict with observation_id and eir_text."""
    ev_block = "\n".join(f"- {e}" for e in (obs.evidence or [])) or "(none)"

    shape = json.dumps({"observation_id": obs.id, "eir_text": "<expanded regulatory narrative>"}, ensure_ascii=False)

    prompt = f"""
You are generating an Establishment Inspection Report (EIR) section.

STRICT RULES:
- This corresponds to EXACTLY ONE FDA Form 483 observation.
- DO NOT merge with other observations.
- DO NOT create new observations.
- DO NOT drop any details.
- Expand only this observation into formal regulatory narrative suitable for an EIR.
- Reflect the evidence lines faithfully (they are from the 483 record).

Observation:
{obs.text}

Evidence (must be reflected; do not contradict):
{ev_block}

CFR Citation:
{obs.citation}

OUTPUT FORMAT:
Return JSON only with this exact shape (observation_id must match exactly):
{shape}
"""

    response = call_llm(prompt, system=EIR_ONE_TO_ONE_SYSTEM)
    data = _parse_json_object(response)
    if not data:
        raise ValueError(f"EIR section JSON parse failed for observation {obs.id}")

    out = {
        "observation_id": data.get("observation_id"),
        "eir_text": str(data.get("eir_text", "") or ""),
    }
    if str(out["observation_id"]).strip() != str(obs.id).strip():
        raise ValueError(
            f"EIR mapping mismatch: expected observation_id {obs.id!r}, got {out['observation_id']!r}"
        )
    out["observation_id"] = str(obs.id).strip()
    return out


def safe_generate_eir_section(obs: Observation, retries: int = 2) -> dict[str, Any]:
    """Retry LLM + parse + id check a few times before failing."""
    last: Exception | None = None
    attempts = max(1, retries + 1)
    for _ in range(attempts):
        try:
            return generate_eir_section(obs)
        except Exception as e:
            last = e
            continue
    raise ValueError(f"Failed for observation {obs.id}: {last}")


def generate_eir_from_483(
    observations: list[Observation],
    *,
    use_safe_generate: bool = True,
    retries: int = 2,
) -> dict[str, Any]:
    """
    Enforces strict 1:1 mapping between 483 rows and EIR sections.
    Raises ValueError on mapping failure after validation.
    """
    eir_sections: list[dict[str, Any]] = []
    for obs in observations:
        if use_safe_generate:
            section = safe_generate_eir_section(obs, retries=retries)
        else:
            section = generate_eir_section(obs)
        if str(section.get("observation_id")) != str(obs.id):
            raise ValueError(
                f"EIR mapping mismatch: expected {obs.id}, got {section.get('observation_id')}"
            )
        eir_sections.append(section)

    if len(eir_sections) != len(observations):
        raise ValueError(
            f"Observation count mismatch: 483={len(observations)} vs EIR={len(eir_sections)}"
        )

    valid, msg = validate_1to1_mapping(observations, eir_sections)
    if not valid:
        raise ValueError(f"Validation failed: {msg}")

    tp = compute_tp_score(observations, eir_sections)

    return {
        "total_observations": len(observations),
        "sections": eir_sections,
        "validation_ok": True,
        "validation_message": msg,
        "tp_score": tp,
    }


def fetch_approved_483_observations(inspection_id: str) -> list[dict[str, Any]] | None:
    """
    Reserved hook: load approved Form FDA 483 observations for an inspection from persistence.

    Returns None when not implemented (caller should pass observations in the API body).
    """
    _ = inspection_id
    return None
