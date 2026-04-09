"""
FAISS-backed semantic index over Title 21 CFR rows (built from CitationRecord list).

Persists to disk when ``index_dir`` is set so restarts avoid re-embedding all rows.
Falls back to in-memory FAISS if save/load fails.
"""

from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import asdict
from pathlib import Path
from typing import Any

from typing import Protocol

from app.services.embedding_backend import get_sentence_embedding_model


class _CitationLike(Protocol):
    citation: str
    section_title: str
    section_label: str
    part_label: str
    chapter_label: str
    subchapter_label: str
    volume_label: str

logger = logging.getLogger(__name__)

_MANIFEST = "cfr_index_manifest.json"


def _record_fingerprint(records: list[_CitationLike]) -> str:
    h = hashlib.sha256()
    for r in records:
        h.update((r.citation + "\n").encode("utf-8", errors="ignore"))
    return h.hexdigest()[:16]


def _embedding_text(rec: _CitationLike) -> str:
    parts = [
        rec.citation,
        rec.section_title,
        rec.section_label,
        rec.part_label,
        rec.chapter_label,
        rec.subchapter_label,
        rec.volume_label,
    ]
    return " \n".join(p for p in parts if (p or "").strip())


class CFRSemanticIndex:
    """Lazy FAISS index over CFR records."""

    def __init__(
        self,
        *,
        model_name: str,
        index_dir: Path | None,
    ):
        self._model_name = model_name
        self._index_dir = index_dir
        self._faiss: Any = None
        self._records_by_citation: dict[str, _CitationLike] = {}
        self._ready = False

    @property
    def is_ready(self) -> bool:
        return self._ready and self._faiss is not None

    def build(self, records: list[_CitationLike]) -> None:
        if not records:
            logger.warning("CFRSemanticIndex: no records to index")
            return

        from langchain_community.vectorstores import FAISS
        from langchain_core.documents import Document

        self._records_by_citation = {r.citation: r for r in records}
        texts: list[str] = []
        docs: list[Document] = []
        for rec in records:
            t = _embedding_text(rec)
            if not t.strip():
                continue
            texts.append(t)
            docs.append(
                Document(
                    page_content=t,
                    metadata={
                        "citation": rec.citation,
                        "section_title": rec.section_title,
                        "section_label": rec.section_label,
                        "part_label": rec.part_label,
                        "chapter_label": rec.chapter_label,
                        "subchapter_label": rec.subchapter_label,
                        "volume_label": rec.volume_label,
                    },
                )
            )

        if not docs:
            logger.warning("CFRSemanticIndex: no non-empty embedding texts")
            return

        emb = get_sentence_embedding_model(self._model_name)
        fingerprint = _record_fingerprint(records)

        loaded = False
        if self._index_dir:
            self._index_dir.mkdir(parents=True, exist_ok=True)
            manifest_path = self._index_dir / _MANIFEST
            if manifest_path.is_file():
                try:
                    man = json.loads(manifest_path.read_text(encoding="utf-8"))
                    if man.get("fingerprint") == fingerprint and man.get("model") == self._model_name:
                        self._faiss = FAISS.load_local(
                            str(self._index_dir),
                            emb,
                            allow_dangerous_deserialization=True,
                        )
                        loaded = True
                        logger.info("Loaded CFR FAISS index from %s", self._index_dir)
                except Exception as e:
                    logger.warning("Could not load CFR FAISS cache: %s", e)

        if not loaded:
            self._faiss = FAISS.from_documents(docs, emb)
            if self._index_dir:
                try:
                    self._faiss.save_local(str(self._index_dir))
                    manifest_path = self._index_dir / _MANIFEST
                    manifest_path.write_text(
                        json.dumps(
                            {
                                "fingerprint": fingerprint,
                                "model": self._model_name,
                                "n_docs": len(docs),
                            },
                            indent=2,
                        ),
                        encoding="utf-8",
                    )
                    logger.info("Saved CFR FAISS index to %s (%d docs)", self._index_dir, len(docs))
                except Exception as e:
                    logger.warning("Could not persist CFR FAISS index: %s", e)

        self._ready = True

    def search(self, query: str, k: int = 8) -> list[tuple[_CitationLike, float]]:
        """Return (record, distance) where distance is LangChain FAISS L2; convert to similarity-like score."""
        if not self.is_ready or not self._faiss:
            return []
        q = (query or "").strip()
        if not q:
            return []

        # similarity_search_with_score returns (doc, score)
        try:
            pairs = self._faiss.similarity_search_with_score(q, k=min(k, 50))
        except Exception as e:
            logger.warning("CFR semantic search failed: %s", e)
            return []

        out: list[tuple[_CitationLike, float]] = []
        for doc, dist in pairs:
            cit = (doc.metadata or {}).get("citation") or ""
            rec = self._records_by_citation.get(cit)
            if rec is None:
                for r in self._records_by_citation.values():
                    if r.citation == cit:
                        rec = r
                        break
            if rec is None:
                continue
            # L2 distance on normalized embeddings: map to [0,1] similarity (higher is better)
            try:
                sim = 1.0 / (1.0 + float(dist))
            except Exception:
                sim = 0.0
            out.append((rec, round(sim, 4)))

        return out
