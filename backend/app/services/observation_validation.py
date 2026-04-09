"""Derive per-observation validation + traceability fields for AI draft output."""

from __future__ import annotations

import re
from typing import Any

from app.evaluation.evaluator import (
    CFR_PATTERN,
    _default_embed_fn,
    _evidence_item_grounded_combined,
    _grounded_any_evidence,
)

# Align with citation_service threshold used in ai router
DEFAULT_CFR_MATCH_THRESHOLD = 0.95


def _page_hint_for_excerpt(raw_notes: str, excerpt: str) -> int:
    """Best-effort page number when OCR notes contain 'Page N' markers before the excerpt window."""
    raw = raw_notes or ""
    ex = (excerpt or "").strip()
    if len(ex) < 8 or not raw:
        return 1
    pos = raw.find(ex[: min(48, len(ex))])
    if pos < 0:
        pos = raw.lower().find(ex.lower()[:32])
    head = raw[: pos] if pos > 0 else raw
    pages = [int(m.group(1)) for m in re.finditer(r"(?:^|\n)\s*page\s+(\d+)\s*(?:\n|$)", head, re.IGNORECASE)]
    return pages[-1] if pages else 1


def infer_evidence_sources(
    observation_id: str,
    raw_notes: str,
    source_notes_excerpt: str,
    file_id: str = "inspection_notes",
) -> list[dict[str, Any]]:
    """Map observation to evidence anchors (synthetic file id + page + highlight)."""
    excerpt = (source_notes_excerpt or "").strip()
    if not excerpt:
        return []
    page = _page_hint_for_excerpt(raw_notes, excerpt)
    return [
        {
            "file_id": file_id,
            "page": page,
            "highlight_text": excerpt[:400],
        }
    ]


def _grounding_effective(
    input_text: str,
    obs: dict[str, Any],
    *,
    grounding_mode: str,
    grounding_similarity_threshold: float,
    evidence_mode: str,
    grounding_cache: Any,
) -> bool:
    gm = (grounding_mode or "substring").strip().lower()
    ev_list = obs.get("evidence_list") if isinstance(obs.get("evidence_list"), list) else []
    if not ev_list:
        return False
    src_lower = (input_text or "").lower()
    fn = _default_embed_fn()
    em = (evidence_mode or "balanced").strip().lower()
    if gm == "substring":
        return _grounded_any_evidence(input_text, obs)
    for item in ev_list:
        s = str(item).strip()
        if not s:
            continue
        sub, comb, _ = _evidence_item_grounded_combined(
            s,
            input_text,
            src_lower,
            grounding_mode=gm,
            similarity_threshold=grounding_similarity_threshold,
            cache=grounding_cache,
            embed_fn=fn,
        )
        ok = sub if em == "strict" else (comb if gm in ("semantic", "hybrid") else sub)
        if ok:
            return True
    return False


def build_validation_payload(
    obs: dict[str, Any],
    *,
    input_text: str,
    citation_match_score: float,
    cfr_threshold: float = DEFAULT_CFR_MATCH_THRESHOLD,
    cfr_applicable: bool = True,
    grounding_mode: str | None = None,
    grounding_similarity_threshold: float | None = None,
    evidence_mode: str | None = None,
    grounding_cache: Any | None = None,
) -> dict[str, Any]:
    """Build `validation` object and issues list for API consumers."""
    from app.config import settings

    gm = grounding_mode if grounding_mode is not None else settings.grounding_mode
    gth = (
        grounding_similarity_threshold
        if grounding_similarity_threshold is not None
        else settings.grounding_similarity_threshold
    )
    em = evidence_mode if evidence_mode is not None else settings.evidence_mode

    cfr_text = str(obs.get("cfr_citation") or "")
    cfr_pattern_ok = bool(CFR_PATTERN.search(cfr_text))
    if cfr_applicable:
        cfr_valid = cfr_pattern_ok and float(citation_match_score or 0.0) >= cfr_threshold
    else:
        cfr_valid = True

    grounded = _grounding_effective(
        input_text,
        obs,
        grounding_mode=gm,
        grounding_similarity_threshold=float(gth),
        evidence_mode=em,
        grounding_cache=grounding_cache,
    )
    ev_list = obs.get("evidence_list") if isinstance(obs.get("evidence_list"), list) else []
    evidence_linked = grounded and bool(ev_list)

    issues: list[str] = []
    if cfr_applicable and not cfr_valid:
        issues.append("CFR citation not verified against Title 21 reference data or malformed CFR format.")
    if not evidence_linked:
        issues.append("Evidence bullets not fully anchored in source notes (partial or missing linkage).")
    if not grounded:
        issues.append("Weak regulatory grounding: evidence not clearly supported by uploaded notes.")

    narrative = str(obs.get("observation_text") or "")
    language_quality = "strong" if len(narrative) > 80 and "shall" in narrative.lower() else "weak"
    if language_quality == "weak" and narrative:
        issues.append("Weak regulatory language: strengthen with specific observations and regulatory verbs.")

    flags = obs.get("review_flags") if isinstance(obs.get("review_flags"), list) else []
    for f in flags:
        if isinstance(f, str) and f.strip():
            issues.append(f.strip())

    # Dedupe while preserving order
    seen: set[str] = set()
    deduped: list[str] = []
    for i in issues:
        if i not in seen:
            seen.add(i)
            deduped.append(i)

    return {
        "cfr_valid": cfr_valid,
        "evidence_linked": evidence_linked,
        "language_quality": language_quality,
        "issues": deduped[:12],
    }
