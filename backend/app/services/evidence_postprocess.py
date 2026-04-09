from __future__ import annotations

import re

from rapidfuzz import fuzz, process

from app.services.evidence_extractor import normalize_text

_MIN_SUB_LEN = 3


def _haystack_lower(raw_notes: str) -> str:
    """Match extractor: newlines → space so sentence picks align with substring checks."""
    return normalize_text(raw_notes).lower()


def _evidence_in_notes(evidence: str, haystack_lower: str) -> bool:
    s = str(evidence).strip()
    return len(s) >= _MIN_SUB_LEN and s.lower() in haystack_lower


def _sentence_chunks(raw_notes: str) -> list[str]:
    """Non-overlapping sentence-like segments for fuzzy rescue."""
    text = normalize_text(raw_notes)
    if not text:
        return []
    parts = re.split(r"(?<=[.!?])\s+", text)
    chunks = [p.strip() for p in parts if len(p.strip()) > 10]
    if not chunks and text:
        chunks = [text]
    return chunks


def ensure_substring(
    evidence_list: list[str],
    raw_notes: str,
    *,
    score_cutoff: float = 80.0,
) -> list[str]:
    """
    Keep bullets that are contiguous substrings of raw_notes (case-insensitive, matches app evaluation).
    For others, try to replace with the best matching sentence chunk from raw_notes (rapidfuzz partial_ratio).
    """
    hay = _haystack_lower(raw_notes)
    chunks = _sentence_chunks(raw_notes)
    if not chunks:
        chunks = [(raw_notes or "").strip()] if (raw_notes or "").strip() else []

    fixed: list[str] = []
    for ev in evidence_list:
        s = str(ev).strip()
        if not s:
            continue
        if _evidence_in_notes(s, hay):
            fixed.append(s)
            continue
        if not chunks:
            continue
        hit = process.extractOne(s, chunks, scorer=fuzz.partial_ratio)
        if hit is None:
            continue
        match, score, _ = hit
        if float(score) >= score_cutoff:
            fixed.append(match.strip())

    return fixed
