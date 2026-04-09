from __future__ import annotations

from typing import Any


def _iter_observation_scores(records: list[dict[str, Any]]):
    """Yield each observation-level score dict from stored evaluation records (supports legacy format)."""
    for rec in records:
        scores = rec.get("scores") or {}
        obs_list = scores.get("observations")
        if isinstance(obs_list, list) and obs_list:
            for o in obs_list:
                if isinstance(o, dict):
                    yield o
            continue
        yield {
            "structure": scores.get("structure"),
            "cfr_valid": scores.get("cfr_valid"),
            "grounded": scores.get("grounded"),
            "ocr_accuracy": scores.get("ocr_accuracy"),
            "overall": scores.get("overall", 0.0),
            "evidence_precision": scores.get("evidence_precision"),
            "grounding_recall": scores.get("grounding_recall"),
            "grounding_f1": scores.get("grounding_f1"),
            "narrative_grounding_ratio": scores.get("narrative_grounding_ratio"),
        }


def _mean_optional(vals: list[float]) -> float:
    return sum(vals) / len(vals) if vals else 0.0


def aggregate_metrics(records: list[dict[str, Any]]) -> dict[str, float]:
    """Aggregate KPIs across every observation and run-level micro grounding stats."""
    obs_scores = list(_iter_observation_scores(records))
    if not obs_scores:
        return {
            "structure_rate": 0.0,
            "cfr_accuracy": 0.0,
            "grounding_rate": 0.0,
            "ocr_avg": 0.0,
            "overall_score": 0.0,
            "observation_count": 0.0,
            "evidence_precision_avg": 0.0,
            "grounding_recall_avg": 0.0,
            "grounding_f1_avg": 0.0,
            "narrative_grounding_avg": 0.0,
            "grounding_f1_micro_run_avg": 0.0,
        }

    n = len(obs_scores)
    struct_sum = sum(1.0 for o in obs_scores if o.get("structure"))
    cfr_sum = sum(1.0 for o in obs_scores if o.get("cfr_valid"))
    ground_sum = sum(1.0 for o in obs_scores if o.get("grounded"))
    ocr_vals: list[float] = []
    overall_sum = 0.0
    ev_prec: list[float] = []
    gr_rec: list[float] = []
    gf1: list[float] = []
    narr: list[float] = []

    for o in obs_scores:
        oa = o.get("ocr_accuracy")
        if oa is not None:
            try:
                ocr_vals.append(float(oa))
            except (TypeError, ValueError):
                pass
        try:
            overall_sum += float(o.get("overall", 0.0))
        except (TypeError, ValueError):
            pass
        for key, bucket in (
            ("evidence_precision", ev_prec),
            ("grounding_recall", gr_rec),
            ("grounding_f1", gf1),
            ("narrative_grounding_ratio", narr),
        ):
            v = o.get(key)
            if v is not None:
                try:
                    bucket.append(float(v))
                except (TypeError, ValueError):
                    pass

    ocr_avg = sum(ocr_vals) / len(ocr_vals) if ocr_vals else 0.0

    run_f1_micro: list[float] = []
    for rec in records:
        s = rec.get("scores") or {}
        v = s.get("grounding_f1_micro")
        if v is not None:
            try:
                run_f1_micro.append(float(v))
            except (TypeError, ValueError):
                pass

    return {
        "structure_rate": round(100.0 * struct_sum / n, 2),
        "cfr_accuracy": round(100.0 * cfr_sum / n, 2),
        "grounding_rate": round(100.0 * ground_sum / n, 2),
        "ocr_avg": round(100.0 * ocr_avg, 2),
        "overall_score": round(100.0 * overall_sum / n, 2),
        "observation_count": float(n),
        "evidence_precision_avg": round(100.0 * _mean_optional(ev_prec), 2),
        "grounding_recall_avg": round(100.0 * _mean_optional(gr_rec), 2),
        "grounding_f1_avg": round(100.0 * _mean_optional(gf1), 2),
        "narrative_grounding_avg": round(100.0 * _mean_optional(narr), 2),
        "grounding_f1_micro_run_avg": round(100.0 * _mean_optional(run_f1_micro), 2),
    }
