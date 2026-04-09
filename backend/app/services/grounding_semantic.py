"""
Semantic grounding: compare evidence text to source chunks via sentence embeddings.

Substring checks remain in ``evaluator``; this module augments them when ``hybrid`` or ``semantic`` mode is on.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
import math
from typing import Any

logger = logging.getLogger(__name__)


def _l2_normalize(vec: list[float]) -> list[float]:
    n = math.sqrt(sum(x * x for x in vec)) + 1e-9
    return [x / n for x in vec]


def _cosine_matrix_vector(rows: list[list[float]], vec: list[float]) -> list[float]:
    v = _l2_normalize(vec)
    out: list[float] = []
    for row in rows:
        rn = _l2_normalize(row)
        out.append(sum(a * b for a, b in zip(rn, v)))
    return out


def _argmax(vals: list[float]) -> int:
    if not vals:
        return 0
    return max(range(len(vals)), key=lambda i: vals[i])


def _split_source_chunks(source_text: str, max_chunk_chars: int = 900) -> list[str]:
    """Split into sentence-ish chunks for embedding (cache-friendly)."""
    text = (source_text or "").strip()
    if not text:
        return []
    parts = re.split(r"(?<=[.!?])\s+", text)
    chunks: list[str] = []
    buf = ""
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if len(buf) + len(p) > max_chunk_chars and buf:
            chunks.append(buf.strip())
            buf = p
        else:
            buf = (buf + " " + p).strip()
    if buf:
        chunks.append(buf.strip())
    if not chunks and text:
        chunks = [text[:max_chunk_chars]]
    return chunks


@dataclass
class GroundingCache:
    """Caches chunk embeddings for one evaluation request (source text fixed)."""

    source_text: str
    model_name: str
    _chunk_texts: list[str] = field(default_factory=list)
    _vectors: list[list[float]] | None = None
    _built: bool = False

    def ensure(self, embed_fn) -> None:
        if self._built:
            return
        self._chunk_texts = _split_source_chunks(self.source_text)
        if not self._chunk_texts:
            self._vectors = None
            self._built = True
            return
        try:
            vecs = embed_fn(self._chunk_texts)
            self._vectors = [list(map(float, v)) for v in vecs]
        except Exception as e:
            logger.warning("GroundingCache embedding failed: %s", e)
            self._vectors = None
        self._built = True

    def max_similarity(self, evidence_text: str, embed_fn) -> float:
        ev = (evidence_text or "").strip()
        if not ev or not self._vectors:
            return 0.0
        try:
            v_ev = list(map(float, embed_fn([ev])[0]))
            sims = _cosine_matrix_vector(self._vectors, v_ev)
            return float(max(sims)) if sims else 0.0
        except Exception as e:
            logger.debug("max_similarity failed: %s", e)
            return 0.0


def semantic_grounded(
    evidence_text: str,
    source_text: str,
    *,
    threshold: float = 0.78,
    cache: GroundingCache | None = None,
    embed_fn=None,
) -> tuple[bool, float]:
    """
    True if max cosine similarity between evidence and any source chunk >= threshold.
    ``embed_fn`` must be (list[str]) -> list[list[float]] (batch embeddings).
    """
    if embed_fn is None:
        from app.services.embedding_backend import get_sentence_embedding_model

        emb = get_sentence_embedding_model()
        embed_fn = lambda texts: emb.embed_documents(texts)  # noqa: E731

    c = cache
    if c is None:
        c = GroundingCache(source_text=source_text, model_name="")
        c.ensure(embed_fn)

    score = c.max_similarity(evidence_text, embed_fn)
    return score >= threshold, score


def grounded_by_substring_or_semantic(
    evidence_text: str,
    source_text: str,
    *,
    substring_fn,
    threshold: float = 0.78,
    cache: GroundingCache | None = None,
    embed_fn=None,
) -> tuple[bool, str, float | None]:
    """
    Returns (grounded, grounded_via, semantic_score).

    ``substring_fn(evidence, source_lower) -> bool`` — e.g. evaluator._evidence_item_in_source logic.
    """
    src_l = (source_text or "").lower()
    if substring_fn(evidence_text, src_l):
        return True, "substring", None

    ok, sim = semantic_grounded(
        evidence_text,
        source_text,
        threshold=threshold,
        cache=cache,
        embed_fn=embed_fn,
    )
    if ok:
        return True, "semantic", sim
    return False, "none", sim


def grounding_failure_debug(
    evidence_text: str,
    source_text: str,
    *,
    cache: GroundingCache,
    embed_fn,
) -> dict[str, Any]:
    """Best-effort: which chunk was closest and similarity."""
    ev = (evidence_text or "").strip()
    if not ev or not cache._chunk_texts:
        return {"evidence": ev, "closest_chunk": None, "similarity": None}
    try:
        v_ev = list(map(float, embed_fn([ev])[0]))
        if cache._vectors is None:
            return {"evidence": ev, "closest_chunk": None, "similarity": None}
        sims = _cosine_matrix_vector(cache._vectors, v_ev)
        idx = _argmax(sims)
        return {
            "evidence": ev,
            "closest_chunk": cache._chunk_texts[idx][:500],
            "similarity": round(float(sims[idx]), 4),
        }
    except Exception as e:
        return {"evidence": ev, "error": str(e), "closest_chunk": None, "similarity": None}
