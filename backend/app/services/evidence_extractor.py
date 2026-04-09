from __future__ import annotations

import re


def normalize_text(text: str) -> str:
    return text.replace("\n", " ").strip()


def split_into_sentences(text: str) -> list[str]:
    text = normalize_text(text)
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [s.strip() for s in sentences if len(s.strip()) > 10]


def keyword_filter(sentences: list[str]) -> list[str]:
    keywords = ["not", "failed", "missing", "lack", "no", "without", "inadequate"]
    filtered: list[str] = []
    for s in sentences:
        low = s.lower()
        if any(k in low for k in keywords):
            filtered.append(s)
    return filtered if filtered else sentences[:10]


def extract_candidate_evidence(raw_notes: str) -> list[str]:
    sentences = split_into_sentences(raw_notes or "")
    return keyword_filter(sentences)
