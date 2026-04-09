"""Observation-level confidence from grounding, CFR match, structure, and retrieval."""

from __future__ import annotations

from typing import Any


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def _component(val: float | None, *, default_neutral: float = 0.5) -> float:
    """Missing or non-finite values use a neutral mid score so the blend stays stable."""
    if val is None:
        return default_neutral
    try:
        v = float(val)
    except (TypeError, ValueError):
        return default_neutral
    if v != v:  # NaN
        return default_neutral
    return _clamp01(v)


def compute_observation_confidence(
    *,
    grounding_f1: float | None = None,
    cfr_score: float | None = None,
    structure_score: float | None = None,
    retrieval_score: float | None = None,
) -> tuple[float, dict[str, Any]]:
    """
    confidence = 0.3*grounding_f1 + 0.3*cfr_score + 0.2*structure_score + 0.2*retrieval_score

    Returns (total in [0,1], breakdown with component inputs and weights).
    """
    gf = _component(grounding_f1)
    cf = _component(cfr_score)
    sf = _component(structure_score)
    rf = _component(retrieval_score)
    total = 0.3 * gf + 0.3 * cf + 0.2 * sf + 0.2 * rf
    total = round(_clamp01(total), 4)
    breakdown: dict[str, Any] = {
        "grounding_f1": round(gf, 4),
        "cfr_score": round(cf, 4),
        "structure_score": round(sf, 4),
        "retrieval_score": round(rf, 4),
        "weights": {
            "grounding_f1": 0.3,
            "cfr_score": 0.3,
            "structure_score": 0.2,
            "retrieval_score": 0.2,
        },
    }
    return total, breakdown


def mean_retrieval_score_from_package(note_rows: list[dict[str, Any]] | None, kb_rows: list[dict[str, Any]] | None) -> float:
    """Average chunk similarity scores from note + KB retrieval; neutral 0.5 when nothing scored."""
    scores: list[float] = []
    for r in note_rows or []:
        s = r.get("score")
        if s is not None:
            try:
                scores.append(float(s))
            except (TypeError, ValueError):
                continue
    for r in kb_rows or []:
        s = r.get("score")
        if s is not None:
            try:
                scores.append(float(s))
            except (TypeError, ValueError):
                continue
    if not scores:
        return 0.5
    return round(_clamp01(sum(scores) / len(scores)), 4)


def aggregate_run_confidence(
    observation_totals: list[float],
    *,
    component_breakdowns: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Run-level aggregates from per-observation confidence totals (and optional component means)."""
    n = len(observation_totals)
    if n == 0:
        return {
            "observation_count": 0,
            "avg_confidence": 0.0,
            "min_confidence": 0.0,
            "max_confidence": 0.0,
        }
    totals = [_clamp01(float(t)) for t in observation_totals]
    out: dict[str, Any] = {
        "observation_count": n,
        "avg_confidence": round(sum(totals) / n, 4),
        "min_confidence": round(min(totals), 4),
        "max_confidence": round(max(totals), 4),
    }
    if component_breakdowns and len(component_breakdowns) == n:
        for key in ("grounding_f1", "cfr_score", "structure_score", "retrieval_score"):
            vals: list[float] = []
            for b in component_breakdowns:
                v = b.get(key)
                if v is not None:
                    try:
                        vals.append(_clamp01(float(v)))
                    except (TypeError, ValueError):
                        continue
            if vals:
                out[f"avg_{key}"] = round(sum(vals) / len(vals), 4)
    return out
