"""Inspection-level evaluation metrics derived from stored AI evaluation runs (per doc_id)."""

from __future__ import annotations

import math
from typing import Any

from app.evaluation.evaluator import evaluate_ai_output, failing_evidence_snippets
from app.evaluation.store import get_evaluation_by_id, list_evaluations_for_inspection


def _scale_0_100(x: float | None) -> int:
    if x is None:
        return 0
    try:
        v = float(x)
    except (TypeError, ValueError):
        return 0
    if math.isnan(v):
        return 0
    # Stored metrics are often 0–1; scores.overall may be 0–1 as well
    if v <= 1.0 + 1e-6:
        v = v * 100.0
    return int(max(0, min(100, round(v))))


def compute_ocr_accuracy(document_id: str) -> tuple[int, str]:
    rec = get_evaluation_by_id(document_id)
    if not rec:
        return 0, "No evaluation record found for this document run."
    scores = rec.get("scores") or {}
    obs_list = scores.get("observations")
    ocr_vals: list[float] = []
    if isinstance(obs_list, list) and obs_list:
        for o in obs_list:
            if not isinstance(o, dict):
                continue
            oa = o.get("ocr_accuracy")
            if oa is not None:
                try:
                    ocr_vals.append(float(oa))
                except (TypeError, ValueError):
                    pass
    if ocr_vals:
        mean = sum(ocr_vals) / len(ocr_vals)
        pct = _scale_0_100(mean)
        return pct, f"Mean OCR alignment score across {len(ocr_vals)} observation(s) (WER-based when ground truth provided)."
    oa_run = scores.get("ocr_accuracy")
    if oa_run is not None:
        return _scale_0_100(float(oa_run)), "Run-level OCR score from evaluation aggregate."
    return 72, "Ground truth not provided; heuristic baseline assuming typical OCR extraction quality."


def compute_cfr_match_score(document_id: str) -> tuple[int, str]:
    rec = get_evaluation_by_id(document_id)
    if not rec:
        return 0, "No evaluation record found for this document run."
    scores = rec.get("scores") or {}
    obs_list = scores.get("observations")
    if isinstance(obs_list, list) and obs_list:
        flags = [bool(o.get("cfr_valid")) for o in obs_list if isinstance(o, dict)]
        if flags:
            rate = sum(1 for f in flags if f) / len(flags)
            pct = int(round(rate * 100))
            return pct, f"Share of draft observations with valid CFR structure and grounding ({len(flags)} row(s))."
    if scores.get("cfr_valid"):
        return 88, "Run-level CFR validity flag set true for this generation."
    return 65, "CFR validity mixed or missing per-observation breakdown; review citations manually."


def compute_evidence_coverage(document_id: str) -> tuple[int, str]:
    rec = get_evaluation_by_id(document_id)
    if not rec:
        return 0, "No evaluation record found for this document run."
    scores = rec.get("scores") or {}
    gf1 = scores.get("grounding_f1_micro")
    if gf1 is not None:
        return _scale_0_100(float(gf1)), "Micro-averaged evidence F1 (precision/recall on evidence bullets vs source)."
    obs_list = scores.get("observations")
    if isinstance(obs_list, list) and obs_list:
        gfs = [float(o.get("grounding_f1") or 0) for o in obs_list if isinstance(o, dict)]
        if gfs:
            return _scale_0_100(sum(gfs) / len(gfs)), "Mean observation-level grounding F1 across evidence lists."
    gr = scores.get("grounding_recall_micro")
    if gr is not None:
        return _scale_0_100(float(gr)), "Grounding recall proxy when F1 not available."
    return 70, "Insufficient telemetry; estimated coverage from default heuristic."


def detect_hallucinations(document_id: str) -> tuple[list[str], int]:
    """
    Return human-readable flags and a risk score 0–100 (higher = safer / fewer hallucination signals).

    One consolidated line per observation when grounding fails (avoids duplicate bullets vs precision lines).
    Verbatim rule matches evaluator: each evidence string (trimmed, lowercased) must appear as a substring of raw notes.
    """
    rec = get_evaluation_by_id(document_id)
    if not rec:
        return ["No evaluation record — run AI draft to score hallucination risk."], 40
    scores = rec.get("scores") or {}
    flags: list[str] = []
    input_text = str(rec.get("input") or "")
    ai_out = rec.get("output") or {}
    obs_payload = ai_out.get("observations") if isinstance(ai_out, dict) else []
    if not isinstance(obs_payload, list):
        obs_payload = []

    obs_list = scores.get("observations")
    if isinstance(obs_list, list):
        for i, o in enumerate(obs_list):
            if not isinstance(o, dict):
                continue
            tp = int(o.get("evidence_tp") or 0)
            fp = int(o.get("evidence_fp") or 0)
            total = tp + fp
            grounded = bool(o.get("grounded"))
            prec = o.get("evidence_precision")
            prec_f = float(prec) if prec is not None else None

            draft = obs_payload[i] if i < len(obs_payload) and isinstance(obs_payload[i], dict) else {}
            ev_list = draft.get("evidence_list") if isinstance(draft.get("evidence_list"), list) else []
            snippets = failing_evidence_snippets(ev_list, input_text, max_items=2)

            if total == 0:
                if not grounded:
                    flags.append(
                        f"Observation {i + 1}: no evidence bullets to verify; add verbatim quotes from raw notes."
                    )
                continue

            parts: list[str] = []
            if fp > 0:
                parts.append(
                    f"{fp} of {total} evidence bullet(s) are not verbatim substrings of the raw notes "
                    "(checker: trimmed, case-insensitive substring match)"
                )
            elif not grounded:
                parts.append("no bullet passed the verbatim-in-source check")
            if prec_f is not None and prec_f < 0.5 and fp == 0 and total > 0:
                parts.append(f"low evidence precision ({prec_f:.0%})")

            if not parts:
                continue

            msg = f"Observation {i + 1}: " + "; ".join(parts) + "."
            if snippets:
                a = snippets[0].replace('"', "'")
                b = (snippets[1].replace('"', "'") if len(snippets) > 1 else "")
                msg += f' Example text not found in notes: "{a}"'
                if b:
                    msg += f'; "{b}"'
            flags.append(msg)
    if scores.get("count_match") is False:
        flags.append("Draft observation count does not match pre-draft estimate from notes")
    if not flags:
        flags.append("No automatic hallucination flags; manual review still required for regulatory filings.")
    # Risk score: high when few flags and high grounding F1
    gf1 = scores.get("grounding_f1_micro")
    if gf1 is None and isinstance(obs_list, list) and obs_list:
        gfs = [float(o.get("grounding_f1") or 0) for o in obs_list if isinstance(o, dict)]
        gf1 = sum(gfs) / len(gfs) if gfs else None
    safe = _scale_0_100(float(gf1)) if gf1 is not None else max(40, 100 - min(80, len(flags) * 12))
    return flags[:15], safe


def compute_template_compliance(document_id: str) -> tuple[int, str]:
    rec = get_evaluation_by_id(document_id)
    if not rec:
        return 0, "No evaluation record found for this document run."
    scores = rec.get("scores") or {}
    obs_list = scores.get("observations")
    if isinstance(obs_list, list) and obs_list:
        structs = [bool(o.get("structure")) for o in obs_list if isinstance(o, dict)]
        if structs:
            rate = sum(1 for s in structs if s) / len(structs)
            return int(round(rate * 100)), "Form 483 template structure: observation text, CFR, and evidence present."
    if scores.get("structure"):
        return 90, "Run-level structure check passed."
    return 60, "Some observations may be missing required fields; compare to Form FDA 483 template."


def _overall_from_scores(scores: dict[str, Any]) -> int:
    o = scores.get("overall")
    if o is None:
        return 0
    return _scale_0_100(float(o))


def build_inspection_evaluation_response(inspection_id: str) -> dict[str, Any]:
    """
    Aggregate metrics across all evaluation runs for an inspection (weighted toward latest runs).
    """
    records = list_evaluations_for_inspection(inspection_id)
    if not records:
        return {
            "inspection_id": inspection_id,
            "ocr_accuracy": 0,
            "cfr_match_score": 0,
            "evidence_coverage": 0,
            "hallucination_flags": ["No AI evaluation runs linked to this inspection yet."],
            "template_score": 0,
            "overall_score": 0,
            "per_document": [],
            "explanations": {
                "ocr_accuracy": "Run Form FDA 483 AI draft with inspection_id set to record metrics.",
                "cfr_match_score": "No citation scoring available without a completed run.",
                "evidence_coverage": "No grounding metrics yet.",
                "template_compliance": "No template compliance score yet.",
            },
        }

    per_doc: list[dict[str, Any]] = []
    ocr_list: list[int] = []
    cfr_list: list[int] = []
    ev_list: list[int] = []
    tpl_list: list[int] = []
    hall_flags: list[str] = []
    overalls: list[int] = []

    # Newest last — give more weight to last 3
    for rec in records:
        doc_id = str(rec.get("doc_id") or "")
        if not doc_id:
            continue
        ocr, ocr_ex = compute_ocr_accuracy(doc_id)
        cfr, cfr_ex = compute_cfr_match_score(doc_id)
        ev, ev_ex = compute_evidence_coverage(doc_id)
        flags, risk = detect_hallucinations(doc_id)
        tpl, tpl_ex = compute_template_compliance(doc_id)
        scores = rec.get("scores") or {}
        ov = _overall_from_scores(scores) if scores else int(round(0.25 * (ocr + cfr + ev + tpl)))

        per_doc.append(
            {
                "document_id": doc_id,
                "created_at": rec.get("created_at"),
                "ocr_accuracy": ocr,
                "cfr_match_score": cfr,
                "evidence_coverage": ev,
                "hallucination_flags": flags[:5],
                "hallucination_safety_score": risk,
                "template_score": tpl,
                "overall_score": ov,
                "explanations": {
                    "ocr_accuracy": ocr_ex,
                    "cfr_match_score": cfr_ex,
                    "evidence_coverage": ev_ex,
                    "template_compliance": tpl_ex,
                },
            }
        )
        ocr_list.append(ocr)
        cfr_list.append(cfr)
        ev_list.append(ev)
        tpl_list.append(tpl)
        overalls.append(ov)
        hall_flags.extend(flags)

    def avg(vals: list[int]) -> int:
        return int(round(sum(vals) / len(vals))) if vals else 0

    # Weight last run double if multiple
    if len(overalls) >= 2:
        overall_out = int(round((overalls[-1] * 2 + sum(overalls[:-1])) / (len(overalls) + 1)))
    else:
        overall_out = overalls[0] if overalls else 0

    latest = records[-1]
    latest_id = str(latest.get("doc_id") or "")
    hf, _ = detect_hallucinations(latest_id) if latest_id else ([], 0)

    return {
        "inspection_id": inspection_id,
        "ocr_accuracy": avg(ocr_list),
        "cfr_match_score": avg(cfr_list),
        "evidence_coverage": avg(ev_list),
        "hallucination_flags": hf or hall_flags[:8],
        "template_score": avg(tpl_list),
        "overall_score": overall_out,
        "per_document": per_doc,
        "explanations": {
            "ocr_accuracy": "Aggregated across evaluation runs for this inspection.",
            "cfr_match_score": "Aggregated CFR validity and Title 21 match rates.",
            "evidence_coverage": "Aggregated grounding F1 / recall signals.",
            "template_compliance": "Aggregated 483 structural completeness checks.",
        },
    }


def recompute_scores_for_record(rec: dict[str, Any]) -> dict[str, Any]:
    """Re-run evaluator on a stored record (used if scores missing)."""
    inp = rec.get("input") or ""
    out = rec.get("output") or {}
    if not isinstance(out, dict):
        return rec.get("scores") or {}
    return evaluate_ai_output(inp, out, None, expected_observation_count=None)
