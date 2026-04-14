from __future__ import annotations

import logging
import re
from typing import Literal

from rapidfuzz import fuzz, process

from app.services.evidence_extractor import normalize_text

logger = logging.getLogger(__name__)

_MIN_SUB_LEN = 3

GroundingType = Literal["exact_match", "fuzzy_match", "extracted_fallback"]


def normalize(text: str) -> str:
    """Collapse whitespace and lowercase for substring comparison (handles OCR noise, casing, spacing)."""
    return re.sub(r"\s+", " ", (text or "").lower().strip())


def is_substring(evidence: str, source: str) -> bool:
    """Normalized substring check — tolerant of casing, extra whitespace, punctuation."""
    return normalize(evidence) in normalize(source)


def _haystack_lower(raw_notes: str) -> str:
    """Match extractor: newlines -> space so sentence picks align with substring checks."""
    return normalize_text(raw_notes).lower()


def _evidence_in_notes(evidence: str, haystack_lower: str) -> bool:
    s = str(evidence).strip()
    return len(s) >= _MIN_SUB_LEN and s.lower() in haystack_lower


def _evidence_in_notes_normalized(evidence: str, source: str) -> bool:
    """Normalized substring check using collapse function."""
    s = str(evidence).strip()
    return len(s) >= _MIN_SUB_LEN and is_substring(s, source)


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


def extract_exact_sentences(text: str, *, max_items: int = 5) -> list[str]:
    """Deterministic extraction: split into sentences, pick meaningful ones (deficiency keywords)."""
    sentences = _sentence_chunks(text)
    if not sentences:
        return []

    deficiency_keywords = [
        "not", "failed", "failure", "missing", "lack", "no ", "without",
        "inadequate", "did not", "does not", "was not", "were not",
        "deficient", "violation", "unable", "incomplete", "absent",
    ]

    prioritized = []
    remaining = []
    for s in sentences:
        low = s.lower()
        if any(kw in low for kw in deficiency_keywords) and len(s) > 20:
            prioritized.append(s)
        elif len(s) > 20:
            remaining.append(s)

    result = prioritized + remaining
    return result[:max_items]


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


def fix_evidence_list(
    evidence_list: list[str],
    source_text: str,
    *,
    max_items: int = 5,
    fuzzy_cutoff: float = 80.0,
) -> tuple[list[str], list[GroundingType]]:
    """Post-LLM evidence grounding fix.

    1. Keep exact substring matches (normalized).
    2. For non-matches, try fuzzy match to a source sentence (rapidfuzz).
    3. If nothing survives, fall back to deterministic sentence extraction.

    Returns (fixed_evidence_list, grounding_types) where grounding_types[i]
    is "exact_match", "fuzzy_match", or "extracted_fallback".
    """
    source = (source_text or "").strip()
    if not source:
        return [], []

    chunks = _sentence_chunks(source)
    if not chunks:
        chunks = [source] if source else []

    fixed: list[str] = []
    types: list[GroundingType] = []
    seen_normalized: set[str] = set()

    for ev in evidence_list or []:
        s = str(ev).strip()
        if not s:
            continue

        norm_s = normalize(s)
        if norm_s in seen_normalized:
            continue

        if _evidence_in_notes_normalized(s, source):
            fixed.append(s)
            types.append("exact_match")
            seen_normalized.add(norm_s)
            continue

        if chunks:
            hit = process.extractOne(s, chunks, scorer=fuzz.partial_ratio)
            if hit is not None:
                match, score, _ = hit
                if float(score) >= fuzzy_cutoff:
                    norm_m = normalize(match)
                    if norm_m not in seen_normalized:
                        fixed.append(match.strip())
                        types.append("fuzzy_match")
                        seen_normalized.add(norm_m)
                        continue

        logger.debug("Dropping ungrounded evidence: %.80s...", s)

    if not fixed:
        fallback = extract_exact_sentences(source, max_items=max_items)
        for fb in fallback:
            norm_fb = normalize(fb)
            if norm_fb not in seen_normalized:
                fixed.append(fb)
                types.append("extracted_fallback")
                seen_normalized.add(norm_fb)
        if fixed:
            logger.info(
                "Evidence fallback: extracted %d sentences from source (LLM evidence was not grounded)",
                len(fixed),
            )

    fixed = fixed[:max_items]
    types = types[:max_items]
    return fixed, types
