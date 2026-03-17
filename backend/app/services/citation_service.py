from __future__ import annotations

import csv
import logging
import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class CitationRecord:
    citation: str
    section_title: str
    section_label: str
    part_label: str
    chapter_label: str
    subchapter_label: str


class CitationService:
    def __init__(self, csv_path: Path):
        self.csv_path = csv_path
        self._records: list[CitationRecord] = []
        self._citation_index: dict[str, CitationRecord] = {}
        self._loaded = False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def load(self) -> None:
        if self._loaded:
            return

        if not self.csv_path.exists():
            logger.warning("Title 21 citation CSV not found: %s", self.csv_path)
            self._loaded = True
            return

        with self.csv_path.open("r", encoding="utf-8", newline="") as fp:
            reader = csv.DictReader(fp)
            for row in reader:
                citation = (row.get("citation") or "").strip()
                if not citation:
                    continue

                record = CitationRecord(
                    citation=citation,
                    section_title=(row.get("section_title") or "").strip(),
                    section_label=(row.get("section_label") or "").strip(),
                    part_label=(row.get("part_label") or "").strip(),
                    chapter_label=(row.get("chapter_label") or "").strip(),
                    subchapter_label=(row.get("subchapter_label") or "").strip(),
                )
                self._records.append(record)
                self._citation_index[self._normalize(citation)] = record

        self._loaded = True
        logger.info("Loaded %s Title 21 citations from %s", len(self._records), self.csv_path)

    def search(self, query: str, limit: int = 10) -> list[dict]:
        self.load()
        q = (query or "").strip()
        if not q or not self._records:
            return []

        normalized_q = self._normalize(q)
        scored: list[tuple[float, CitationRecord]] = []
        for record in self._records:
            norm_citation = self._normalize(record.citation)
            score = SequenceMatcher(None, normalized_q, norm_citation).ratio()
            if normalized_q in norm_citation:
                score = max(score, 0.95)
            elif normalized_q in self._normalize(record.section_title):
                score = max(score, 0.8)

            if score >= 0.45:
                scored.append((score, record))

        scored.sort(key=lambda item: item[0], reverse=True)
        return [self._to_dict(record, score) for score, record in scored[:limit]]

    def best_match(self, citation_text: str) -> dict | None:
        self.load()
        if not citation_text:
            return None

        # Match exact/base citation first (e.g., "21 CFR 211.113(b)" -> "21 CFR 211.113").
        norm = self._normalize(citation_text)
        direct = self._citation_index.get(norm)
        if direct:
            return self._to_dict(direct, 1.0)

        base = self._base_citation(citation_text)
        if base:
            base_norm = self._normalize(base)
            direct_base = self._citation_index.get(base_norm)
            if direct_base:
                return self._to_dict(direct_base, 0.99)

        candidates = self.search(citation_text, limit=1)
        return candidates[0] if candidates else None

    def _to_dict(self, record: CitationRecord, score: float) -> dict:
        return {
            "citation": record.citation,
            "section_title": record.section_title,
            "section_label": record.section_label,
            "part_label": record.part_label,
            "chapter_label": record.chapter_label,
            "subchapter_label": record.subchapter_label,
            "score": round(score, 4),
        }

    def _normalize(self, text: str) -> str:
        return re.sub(r"\s+", " ", text.lower().strip())

    def _base_citation(self, citation_text: str) -> str:
        # Keep only main number in parentheses form: 21 CFR 211.113(b) -> 21 CFR 211.113
        match = re.search(r"(21\s*cfr\s*\d+(?:\.\d+)*)", citation_text.lower())
        if not match:
            return ""
        base = re.sub(r"\s+", " ", match.group(1).strip())
        return base.upper()
