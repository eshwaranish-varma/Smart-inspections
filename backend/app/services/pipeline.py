from __future__ import annotations

from typing import Any

from app.services.evidence_extractor import extract_candidate_evidence, normalize_text
from app.services.evidence_postprocess import ensure_substring
from app.services.evidence_selector import select_evidence
from app.services.observation_generator import generate_observation

_DEFAULT_K = 5
_MAX_RETRIES = 3


def _all_substrings(evidence: list[str], raw_notes: str) -> bool:
    hay = normalize_text(raw_notes).lower()
    for e in evidence:
        s = str(e).strip()
        if len(s) < 3:
            return False
        if s.lower() not in hay:
            return False
    return True


def run_pipeline(raw_notes: str, *, k: int = _DEFAULT_K, max_retries: int = _MAX_RETRIES) -> dict[str, Any]:
    """
    Extract candidate sentences, LLM-select top-k, post-process to verbatim chunks, retry until all grounded or max retries.
    Then generate a single observation narrative from the fixed evidence.
    """
    notes = raw_notes or ""
    candidates = extract_candidate_evidence(notes)
    if not candidates:
        return {"observation": "", "evidence_list": [], "candidates": []}

    fixed: list[str] = []
    for _ in range(max(1, max_retries)):
        selected = select_evidence(candidates, k=k)
        fixed = ensure_substring(selected, notes)
        if fixed and _all_substrings(fixed, notes):
            break

    observation = generate_observation(fixed) if fixed else ""

    return {
        "observation": observation,
        "evidence_list": fixed,
        "candidates": candidates,
    }
