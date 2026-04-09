"""
Lightweight evidence grounding metrics (0–100 scores) for pipeline / dashboards.

For full AI draft scoring see `app.evaluation.evaluator`.
"""

from __future__ import annotations

from typing import Any

from app.services.evidence_extractor import normalize_text


def _bullet_grounded(bullet: str, raw_notes: str) -> bool:
    """True if bullet is substring of raw notes (matches evaluation) or newline-normalized form (pipeline)."""
    s = str(bullet).strip()
    if len(s) < 3:
        return False
    low = s.lower()
    if low in (raw_notes or "").lower():
        return True
    return low in normalize_text(raw_notes).lower()


def compute_evidence_precision(evidence_list: list[str], raw_notes: str) -> dict[str, Any]:
    items = [str(e).strip() for e in evidence_list if str(e).strip()]
    total = len(items)
    supported = sum(1 for e in items if _bullet_grounded(e, raw_notes))
    score = round((supported / total) * 100, 2) if total else 0.0
    return {"score": score, "supported": supported, "total": total}


def compute_grounding_recall(observations: list[dict[str, Any]], raw_notes: str) -> dict[str, Any]:
    """Fraction of observations with at least one evidence string grounded in raw_notes."""
    total = len(observations)
    if total == 0:
        return {"score": 0.0, "grounded": 0, "total": 0}

    grounded = 0
    for obs in observations:
        ev = obs.get("evidence_list")
        if not isinstance(ev, list):
            ev = obs.get("evidence")
            ev = [ev] if ev else []
        if any(_bullet_grounded(str(e), raw_notes) for e in ev):
            grounded += 1

    score = round((grounded / total) * 100, 2)
    return {"score": score, "grounded": grounded, "total": total}


def compute_f1(p: float, r: float) -> float:
    if p + r == 0:
        return 0.0
    return round(2 * (p * r) / (p + r), 2)
