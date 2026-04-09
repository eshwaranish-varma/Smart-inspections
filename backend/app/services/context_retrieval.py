"""
Top-k retrieval from **inspection notes** (chunked + embedded) and **knowledge-base PDFs**.

Falls back to legacy truncation when retrieval is disabled or embedding fails.
"""

from __future__ import annotations

import logging
import math
from typing import Any, TYPE_CHECKING

from app.services.embedding_backend import get_sentence_embedding_model
from app.services.grounding_semantic import _split_source_chunks

if TYPE_CHECKING:
    from app.services.knowledge_base import KnowledgeBaseService

logger = logging.getLogger(__name__)


def _embed_texts(texts: list[str], model_name: str) -> list[list[float]]:
    emb = get_sentence_embedding_model(model_name)
    return [list(map(float, v)) for v in emb.embed_documents(texts)]


def _l2(v: list[float]) -> list[float]:
    n = math.sqrt(sum(x * x for x in v)) + 1e-9
    return [x / n for x in v]


def _cosine_sim(a: list[float], b: list[float]) -> float:
    a, b = _l2(a), _l2(b)
    return sum(x * y for x, y in zip(a, b))


def retrieve_note_chunks(
    raw_notes: str,
    query: str,
    *,
    top_k: int = 6,
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
    max_chunk_chars: int = 2000,
) -> list[dict[str, Any]]:
    """
    Chunk ``raw_notes`` and rank chunks by cosine similarity to ``query`` using sentence embeddings.
    """
    notes = (raw_notes or "").strip()
    q = (query or "").strip()
    if not notes or not q:
        return []

    chunks = _split_source_chunks(notes, max_chunk_chars=max_chunk_chars)
    if not chunks:
        return []

    try:
        vecs = _embed_texts(chunks + [q], embedding_model)
        vq = vecs[-1]
        sims = [_cosine_sim(vecs[i], vq) for i in range(len(chunks))]
    except Exception as e:
        logger.warning("retrieve_note_chunks embedding failed: %s", e)
        return []

    order = sorted(range(len(sims)), key=lambda i: sims[i], reverse=True)
    out: list[dict[str, Any]] = []
    for i in order[:top_k]:
        idx = int(i)
        out.append(
            {
                "text": chunks[idx],
                "source": "inspection_notes",
                "chunk_id": f"note_{idx}",
                "chunk_type": "notes",
                "score": round(float(sims[idx]), 4),
            }
        )
    logger.info("retrieve_note_chunks: %d chunks from notes, returning %d", len(chunks), len(out))
    return out


def build_grounded_context(
    retrieved_note_chunks: list[dict[str, Any]],
    retrieved_regulatory_chunks: list[dict[str, Any]],
    *,
    max_sections: int = 12,
) -> str:
    """Format retrieval results for LLM prompts (auditable blocks)."""
    parts: list[str] = []
    n_block = []
    for i, c in enumerate(retrieved_note_chunks[:max_sections], 1):
        src = c.get("source", "notes")
        score = c.get("score", "")
        parts.append(f"--- Note excerpt {i} (source={src}, score={score}) ---\n{c.get('text', '')}")

    r_block = []
    for i, c in enumerate(retrieved_regulatory_chunks[:max_sections], 1):
        parts.append(
            f"--- Regulatory / IOM excerpt {i} (file={c.get('source', '')}, type={c.get('chunk_type', '')}, "
            f"score={c.get('score', '')}) ---\n{c.get('text', '')}"
        )

    return "\n\n".join(parts) if parts else ""


def build_retrieval_package(
    kb: "KnowledgeBaseService | None",
    raw_notes: str,
    segment_query: str,
    *,
    notes_top_k: int,
    kb_top_k: int,
    max_context_chunks: int,
    use_retrieval: bool,
    embedding_model: str,
) -> dict[str, Any]:
    """
    Returns note snippets, KB snippets, combined context string, and metadata for auditing.
    """
    meta: dict[str, Any] = {"fallback_truncation": False, "note_chunks_n": 0, "kb_chunks_n": 0}

    if not use_retrieval:
        meta["fallback_truncation"] = True
        return {
            "note_snippets": [],
            "kb_snippets": [],
            "context_block": "",
            "retrieval_metadata": meta,
        }

    note_rows = retrieve_note_chunks(
        raw_notes,
        segment_query,
        top_k=notes_top_k,
        embedding_model=embedding_model,
    )
    meta["note_chunks_n"] = len(note_rows)

    kb_rows: list[dict[str, Any]] = []
    if kb and kb.is_initialized:
        try:
            kb_rows = kb.retrieve(segment_query, top_k=kb_top_k)
        except Exception as e:
            logger.warning("KB retrieve failed: %s", e)
    meta["kb_chunks_n"] = len(kb_rows)

    if not note_rows and not kb_rows:
        meta["fallback_truncation"] = True
        logger.warning("Retrieval returned empty; caller should use legacy truncation")

    ctx = build_grounded_context(note_rows, kb_rows, max_sections=max_context_chunks)
    return {
        "note_snippets": [r["text"] for r in note_rows],
        "kb_snippets": [r["text"] for r in kb_rows],
        "note_rows": note_rows,
        "kb_rows": kb_rows,
        "context_block": ctx,
        "retrieval_metadata": meta,
    }


def legacy_truncation_block(raw_notes: str, max_chars: int = 12000) -> str:
    """Fallback when retrieval is off or empty."""
    t = (raw_notes or "").strip()
    if len(t) <= max_chars:
        return t
    return t[:max_chars]


def build_eir_kb_context_list(
    kb: "KnowledgeBaseService | None",
    raw_notes: str,
    query: str,
    *,
    notes_top_k: int,
    kb_top_k: int,
    max_context_chunks: int,
    use_retrieval: bool,
    embedding_model: str,
) -> tuple[list[str], dict[str, Any]]:
    """
    **Phase 2** EIR: returns string list for ``AIService.generate_eir*`` and audit metadata.

    When retrieval is disabled or empty, falls back to legacy truncation of raw notes only for the notes slot;
    callers may still merge with ``kb.query`` if needed.
    """
    pkg = build_retrieval_package(
        kb,
        raw_notes,
        query,
        notes_top_k=notes_top_k,
        kb_top_k=kb_top_k,
        max_context_chunks=max_context_chunks,
        use_retrieval=use_retrieval,
        embedding_model=embedding_model,
    )
    block = (pkg.get("context_block") or "").strip()
    if block:
        texts = [block]
    else:
        texts = []
        for r in pkg.get("note_rows") or []:
            texts.append(r.get("text", ""))
        for r in pkg.get("kb_rows") or []:
            texts.append(r.get("text", ""))
    meta = dict(pkg.get("retrieval_metadata") or {})
    meta["note_row_count"] = len(pkg.get("note_rows") or [])
    meta["kb_row_count"] = len(pkg.get("kb_rows") or [])
    if not texts and (raw_notes or "").strip():
        texts = [legacy_truncation_block(raw_notes, max_chars=12000)]
        meta["fallback_truncation"] = True
    return texts[:max_context_chunks], meta
