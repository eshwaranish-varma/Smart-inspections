from __future__ import annotations

import re
from typing import Any

from app.services.utils_cfr import cfr_match

# Title 21 style: "21 CFR 211.22", "21 CFR 211.113(a)", etc.
CFR_PATTERN = re.compile(r"21\s*CFR\s*\d+(?:\.\d+)+(?:\([a-z]\))?", re.IGNORECASE)

_WORD_TOKEN = re.compile(r"\b[a-z0-9]{4,}\b", re.IGNORECASE)


def _observations_from_payload(ai_output: dict[str, Any]) -> list[dict[str, Any]]:
    if not isinstance(ai_output, dict):
        return []
    obs_list = ai_output.get("observations")
    if isinstance(obs_list, list) and obs_list:
        return [o for o in obs_list if isinstance(o, dict)]
    if any(k in ai_output for k in ("observation_text", "observation", "cfr_citation")):
        return [ai_output]
    return []


def _structure_ok(obs: dict[str, Any]) -> bool:
    has_obs = bool((obs.get("observation_text") or obs.get("observation") or "").strip())
    ev = obs.get("evidence_list")
    if isinstance(ev, list):
        has_ev = any(str(x).strip() for x in ev)
    else:
        has_ev = bool(str(obs.get("evidence") or "").strip())
    has_cfr = bool(str(obs.get("cfr_citation") or "").strip())
    return has_obs and has_ev and has_cfr


def _cfr_valid(obs: dict[str, Any]) -> bool:
    text = str(obs.get("cfr_citation") or "")
    has_pattern = bool(CFR_PATTERN.search(text))
    score = obs.get("citation_match_score")
    if score is not None:
        try:
            return has_pattern and float(score) >= 0.5
        except (TypeError, ValueError):
            pass
    return has_pattern


_NORMALIZE_RE = re.compile(r"\s+")


def _normalize_for_match(text: str) -> str:
    """Collapse whitespace and lowercase — tolerant of OCR noise, casing, spacing."""
    return _NORMALIZE_RE.sub(" ", (text or "").lower().strip())


def _evidence_item_in_source(item: str, src_lower: str) -> bool:
    s = str(item).strip()
    if len(s) < 3:
        return False
    if s.lower() in src_lower:
        return True
    return _normalize_for_match(s) in _normalize_for_match(src_lower)


def _grounded_any_evidence(input_text: str, obs: dict[str, Any]) -> bool:
    src = (input_text or "").lower()
    if not src.strip():
        return False
    ev = obs.get("evidence_list")
    if isinstance(ev, list):
        for item in ev:
            if _evidence_item_in_source(str(item), src):
                return True
        return False
    single = str(obs.get("evidence") or "").strip().lower()
    return len(single) >= 3 and single in src


def failing_evidence_snippets(
    evidence_list: list[Any],
    input_text: str,
    *,
    max_items: int = 2,
    max_len: int = 140,
) -> list[str]:
    """Return up to `max_items` evidence strings that fail verbatim substring check (for UI / flags)."""
    src_lower = (input_text or "").lower()
    out: list[str] = []
    if not isinstance(evidence_list, list):
        return out
    for item in evidence_list:
        s = str(item).strip()
        if not s:
            continue
        if _evidence_item_in_source(s, src_lower):
            continue
        if len(s) <= max_len:
            out.append(s)
        else:
            out.append(s[: max_len - 1] + "…")
        if len(out) >= max_items:
            break
    return out


def _evidence_tp_fp(evidence_list: list[Any], src_lower: str) -> tuple[int, int]:
    """Micro counts: TP = evidence strings verifiable in source; FP = not verifiable."""
    if not isinstance(evidence_list, list) or not evidence_list:
        return 0, 0
    tp = 0
    fp = 0
    for item in evidence_list:
        s = str(item).strip()
        if not s:
            continue
        if _evidence_item_in_source(s, src_lower):
            tp += 1
        else:
            fp += 1
    return tp, fp


def _default_embed_fn():
    from app.services.embedding_backend import get_sentence_embedding_model

    emb = get_sentence_embedding_model()
    return lambda texts: emb.embed_documents(texts)


def _evidence_item_grounded_combined(
    item: str,
    input_text: str,
    src_lower: str,
    *,
    grounding_mode: str,
    similarity_threshold: float,
    cache: Any | None,
    embed_fn,
) -> tuple[bool, bool, float | None]:
    """
    Returns (substring_ok, combined_ok, semantic_score_or_none).

    combined_ok uses semantic similarity only when mode is ``semantic`` or ``hybrid``.
    """
    sub = _evidence_item_in_source(item, src_lower)
    if grounding_mode == "substring":
        return sub, sub, None

    from app.services.grounding_semantic import semantic_grounded

    ok_sem, score = semantic_grounded(
        item,
        input_text,
        threshold=similarity_threshold,
        cache=cache,
        embed_fn=embed_fn,
    )
    if grounding_mode == "semantic":
        return sub, ok_sem, score
    # hybrid
    return sub, (sub or ok_sem), score


def _evidence_tp_fp_with_mode(
    evidence_list: list[Any],
    input_text: str,
    src_lower: str,
    *,
    grounding_mode: str,
    similarity_threshold: float,
    evidence_mode: str,
    cache: Any | None,
    embed_fn,
) -> tuple[int, int, float]:
    """
    TP/FP respecting ``evidence_mode``: strict = substring only counts as TP;
    balanced = substring OR (in hybrid) semantic match counts as TP.
    Returns (tp, fp, semantic_grounding_ratio) where ratio = fraction of items with semantic match among non-substring.
    """
    if not isinstance(evidence_list, list) or not evidence_list:
        return 0, 0, 0.0

    em = (evidence_mode or "balanced").strip().lower()
    gm = (grounding_mode or "substring").strip().lower()
    tp = 0
    fp = 0
    sem_hits = 0
    sem_candidates = 0

    for item in evidence_list:
        s = str(item).strip()
        if not s:
            continue
        sub, combined, sem_score = _evidence_item_grounded_combined(
            s,
            input_text,
            src_lower,
            grounding_mode=gm if gm in ("substring", "semantic", "hybrid") else "substring",
            similarity_threshold=similarity_threshold,
            cache=cache,
            embed_fn=embed_fn,
        )
        if em == "strict":
            ok = sub
        else:
            ok = combined if gm in ("semantic", "hybrid") else sub

        if ok:
            tp += 1
        else:
            fp += 1

        if gm in ("semantic", "hybrid") and not sub:
            sem_candidates += 1
            if sem_score is not None and sem_score >= similarity_threshold:
                sem_hits += 1

    ratio = round(sem_hits / sem_candidates, 4) if sem_candidates else 0.0
    return tp, fp, ratio


def _evidence_precision(tp: int, fp: int) -> float:
    if tp + fp == 0:
        return 1.0
    return tp / (tp + fp)


def _narrative_grounding_ratio(obs_text: str, src_lower: str) -> float:
    """Share of substantive tokens in observation narrative that appear in source (anti-hallucination signal)."""
    text = (obs_text or "").strip().lower()
    if not text or not src_lower:
        return 0.0
    if len(text) < 12:
        return 1.0 if text in src_lower else 0.0
    tokens = _WORD_TOKEN.findall(text)
    if not tokens:
        return 0.0
    hits = sum(1 for t in tokens if t in src_lower)
    return round(hits / len(tokens), 4)


def _grounding_f1(precision: float, recall: float) -> float:
    if precision + recall <= 0:
        return 0.0
    return round(2.0 * precision * recall / (precision + recall), 4)


def _concat_observation_text(obs: dict[str, Any]) -> str:
    parts: list[str] = []
    o = obs.get("observation_text") or obs.get("observation") or ""
    if o:
        parts.append(str(o))
    ev = obs.get("evidence_list")
    if isinstance(ev, list):
        parts.extend(str(x) for x in ev)
    elif obs.get("evidence"):
        parts.append(str(obs["evidence"]))
    c = obs.get("cfr_citation") or ""
    if c:
        parts.append(str(c))
    return " ".join(parts).strip()


def _evaluate_one_observation(
    input_text: str,
    obs: dict[str, Any],
    ground_truth: str | None,
    observation_index: int,
    *,
    cfr_metric_applicable: bool = True,
    cfr_candidates: list[str] | None = None,
    grounding_mode: str = "substring",
    grounding_similarity_threshold: float = 0.78,
    evidence_mode: str = "balanced",
    grounding_cache: Any | None = None,
    embed_fn: Any | None = None,
) -> dict[str, Any]:
    src_lower = (input_text or "").lower()
    structure = _structure_ok(obs)
    if not cfr_metric_applicable:
        cfr_valid: bool | None = None
    elif cfr_candidates:
        cfr_valid = cfr_match(str(obs.get("cfr_citation") or ""), cfr_candidates)
    else:
        cfr_valid = _cfr_valid(obs)

    grounded_substring = _grounded_any_evidence(input_text, obs)
    gm = (grounding_mode or "substring").strip().lower()
    ev_list = obs.get("evidence_list") if isinstance(obs.get("evidence_list"), list) else []

    fn = embed_fn
    if fn is None and gm in ("semantic", "hybrid"):
        fn = _default_embed_fn()

    if gm in ("semantic", "hybrid"):
        tp, fp, semantic_item_ratio = _evidence_tp_fp_with_mode(
            ev_list,
            input_text,
            src_lower,
            grounding_mode=gm,
            similarity_threshold=grounding_similarity_threshold,
            evidence_mode=evidence_mode,
            cache=grounding_cache,
            embed_fn=fn,
        )
        grounded_combined = False
        if isinstance(ev_list, list) and ev_list:
            for item in ev_list:
                s = str(item).strip()
                if not s:
                    continue
                _sub, comb, _sc = _evidence_item_grounded_combined(
                    s,
                    input_text,
                    src_lower,
                    grounding_mode=gm,
                    similarity_threshold=grounding_similarity_threshold,
                    cache=grounding_cache,
                    embed_fn=fn or _default_embed_fn(),
                )
                em = (evidence_mode or "balanced").strip().lower()
                if em == "strict":
                    ok = _sub
                else:
                    ok = comb if gm in ("semantic", "hybrid") else _sub
                if ok:
                    grounded_combined = True
                    break
        else:
            grounded_combined = grounded_substring
    else:
        tp, fp = _evidence_tp_fp(ev_list, src_lower)
        semantic_item_ratio = 0.0
        grounded_combined = grounded_substring

    evidence_precision = round(_evidence_precision(tp, fp), 4)

    grounded = grounded_combined if gm in ("semantic", "hybrid") else grounded_substring
    grounding_recall = 1.0 if grounded else 0.0
    grounding_f1 = _grounding_f1(evidence_precision, grounding_recall)

    narrative_grounding_ratio = _narrative_grounding_ratio(
        str(obs.get("observation_text") or ""),
        src_lower,
    )

    combined_grounding_ratio = 1.0 if grounded_combined else 0.0

    ocr_accuracy: float | None = None
    if ground_truth and str(ground_truth).strip():
        try:
            import jiwer

            hyp = _concat_observation_text(obs)
            ref = str(ground_truth).strip()
            if ref and hyp:
                w = jiwer.wer(ref, hyp)
                ocr_accuracy = max(0.0, min(1.0, 1.0 - float(w)))
        except Exception:
            ocr_accuracy = None

    parts: list[float] = [1.0 if structure else 0.0]
    if cfr_metric_applicable:
        parts.append(1.0 if cfr_valid else 0.0)
    parts.extend([grounding_f1, narrative_grounding_ratio])
    if ocr_accuracy is not None:
        parts.append(ocr_accuracy)
    overall = sum(parts) / len(parts) if parts else 0.0

    return {
        "observation_index": observation_index,
        "structure": structure,
        "cfr_valid": cfr_valid,
        "cfr_metric_applicable": cfr_metric_applicable,
        "grounded": grounded,
        "grounded_substring": grounded_substring,
        "grounded_combined": grounded_combined,
        "grounding_mode": gm,
        "evidence_precision": evidence_precision,
        "grounding_recall": grounding_recall,
        "grounding_f1": grounding_f1,
        "narrative_grounding_ratio": narrative_grounding_ratio,
        "semantic_grounding_ratio": round(semantic_item_ratio, 4) if gm in ("semantic", "hybrid") else None,
        "combined_grounding_ratio": combined_grounding_ratio,
        "evidence_tp": tp,
        "evidence_fp": fp,
        "ocr_accuracy": ocr_accuracy,
        "overall": round(overall, 4),
    }


def validate_observation_count(
    input_obs: list[Any],
    output_obs: list[Any],
) -> dict[str, Any]:
    """Strict 1:1 mapping check between input segmented observations and drafted outputs.

    Returns a dict with status, reason, input_count, and output_count.
    """
    n_in = len(input_obs)
    n_out = len(output_obs)
    if n_in != n_out:
        return {
            "status": "failed",
            "reason": f"Observation count mismatch: {n_in} input vs {n_out} output",
            "input_count": n_in,
            "output_count": n_out,
        }
    return {
        "status": "passed",
        "reason": "1:1 observation mapping verified",
        "input_count": n_in,
        "output_count": n_out,
    }


def evaluate_ai_output(
    input_text: str,
    ai_output: dict[str, Any],
    ground_truth: str | None = None,
    expected_observation_count: int | None = None,
    *,
    cfr_metric_applicable: bool = True,
    cfr_candidates: list[str] | None = None,
    grounding_mode: str = "substring",
    grounding_similarity_threshold: float = 0.78,
    evidence_mode: str = "balanced",
) -> dict[str, Any]:
    """
    Evaluate every observation in the draft. Includes evidence-level precision/recall/F1 for grounding
    and narrative overlap ratio to surface hallucination risk.
    """
    obs_list = _observations_from_payload(ai_output)
    if not obs_list:
        count_match = (
            None
            if expected_observation_count is None
            else (expected_observation_count == 0)
        )
        return {
            "observations": [],
            "overall": 0.0,
            "structure": False,
            "cfr_valid": None if not cfr_metric_applicable else False,
            "cfr_metric_applicable": cfr_metric_applicable,
            "grounded": False,
            "ocr_accuracy": None,
            "observation_count": 0,
            "grounding_precision_micro": 0.0,
            "grounding_recall_micro": 0.0,
            "grounding_f1_micro": 0.0,
            "narrative_grounding_avg": 0.0,
            "expected_observation_count": expected_observation_count,
            "count_match": count_match,
        }

    from app.services.grounding_semantic import GroundingCache

    gcache: GroundingCache | None = None
    gm = (grounding_mode or "substring").strip().lower()
    if gm in ("semantic", "hybrid") and (input_text or "").strip():
        gcache = GroundingCache(source_text=input_text, model_name="")
        try:
            gcache.ensure(_default_embed_fn())
        except Exception:
            gcache = None

    per: list[dict[str, Any]] = [
        _evaluate_one_observation(
            input_text,
            o,
            ground_truth,
            i,
            cfr_metric_applicable=cfr_metric_applicable,
            cfr_candidates=cfr_candidates,
            grounding_mode=grounding_mode,
            grounding_similarity_threshold=grounding_similarity_threshold,
            evidence_mode=evidence_mode,
            grounding_cache=gcache,
            embed_fn=None,
        )
        for i, o in enumerate(obs_list)
    ]
    overalls = [float(p["overall"]) for p in per]
    mean_overall = sum(overalls) / len(overalls) if overalls else 0.0

    ocr_vals = [float(p["ocr_accuracy"]) for p in per if p.get("ocr_accuracy") is not None]
    mean_ocr = sum(ocr_vals) / len(ocr_vals) if ocr_vals else None

    tp_e = sum(int(p.get("evidence_tp", 0) or 0) for p in per)
    fp_e = sum(int(p.get("evidence_fp", 0) or 0) for p in per)
    grounding_precision_micro = round(_evidence_precision(tp_e, fp_e), 4)
    grounding_recall_micro = round(sum(float(p.get("grounding_recall", 0) or 0) for p in per) / len(per), 4)
    grounding_f1_micro = _grounding_f1(grounding_precision_micro, grounding_recall_micro)
    narrative_grounding_avg = round(
        sum(float(p.get("narrative_grounding_ratio", 0) or 0) for p in per) / len(per),
        4,
    )

    count_match = (
        None
        if expected_observation_count is None
        else (len(per) == expected_observation_count)
    )

    cfr_valid_list = [p["cfr_valid"] for p in per]
    valid_cfrs = [c for c in cfr_valid_list if c is not None]
    if len(valid_cfrs) == 0:
        cfr_agg = None
    else:
        cfr_agg = all(valid_cfrs)

    return {
        "observations": per,
        "observation_count": len(per),
        "overall": round(mean_overall, 4),
        "structure": all(p["structure"] for p in per),
        "cfr_valid": cfr_agg,
        "cfr_metric_applicable": cfr_metric_applicable,
        "grounded": all(p["grounded"] for p in per),
        "ocr_accuracy": round(mean_ocr, 4) if mean_ocr is not None else None,
        "grounding_precision_micro": grounding_precision_micro,
        "grounding_recall_micro": grounding_recall_micro,
        "grounding_f1_micro": grounding_f1_micro,
        "narrative_grounding_avg": narrative_grounding_avg,
        "evidence_tp_total": tp_e,
        "evidence_fp_total": fp_e,
        "expected_observation_count": expected_observation_count,
        "count_match": count_match,
    }
