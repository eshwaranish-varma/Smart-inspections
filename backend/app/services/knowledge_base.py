from __future__ import annotations
import logging
import re
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)


class KnowledgeBaseService:
    """
    Loads regulatory PDFs from ``data_dir``, chunks them, and optionally builds a FAISS index (OpenAI embeddings).

    **Phase 2** EIR drafting uses ``retrieve()`` for grounded IOM/regulatory context instead of only the first N chars.
    """

    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.is_initialized = False
        self.chunks: list[dict] = []
        self.vector_store = None
        self._example_483_text: str = ""
        self._chunk_seq = 0

    def initialize(self):
        """Load PDFs from data_dir, chunk, and build index."""
        pdf_files = list(self.data_dir.glob("**/*.pdf"))
        for pdf_path in pdf_files:
            try:
                self._ingest_pdf(pdf_path)
            except Exception as e:
                logger.warning("Failed to ingest %s: %s", pdf_path.name, e)

        try:
            self._build_vector_store()
        except Exception as e:
            logger.warning("Vector store build failed, falling back to keyword search: %s", e)

        self.is_initialized = True
        logger.info(
            "Knowledge base initialized with %d chunks from %d PDFs",
            len(self.chunks),
            len(pdf_files),
        )

    def _ingest_pdf(self, path: Path):
        """Extract text from PDF and chunk it."""
        try:
            import fitz
        except ImportError:
            logger.error("PyMuPDF not installed")
            return

        doc = fitz.open(path)
        full_text = ""
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text() or ""
            full_text += text + "\n"
        doc.close()

        if "inspection-observations" in path.name.lower() or "able" in path.name.lower():
            self._example_483_text = full_text[:5000]

        ctype = "reference"
        pl = path.name.lower()
        if "iom" in pl or "investigation" in pl:
            ctype = "iom"
        elif "eir" in pl or "establishment" in pl:
            ctype = "eir_reference"
        new_chunks = self._chunk_text(full_text, source=path.name, chunk_type=ctype)
        self.chunks.extend(new_chunks)
        logger.info("Ingested %s: %d chunks", path.name, len(new_chunks))

    def _chunk_text(
        self,
        text: str,
        source: str,
        max_chars: int = 2000,
        overlap_chars: int = 200,
        *,
        chunk_type: str = "reference",
    ) -> list[dict]:
        """Split text into overlapping chunks (~500 tokens at 4 chars/token)."""
        text = text.strip()
        if not text:
            return []

        paragraphs = re.split(r"\n\s*\n", text)
        chunks: list[dict] = []
        current = ""

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            if len(current) + len(para) > max_chars and current:
                self._chunk_seq += 1
                chunks.append(
                    {
                        "text": current.strip(),
                        "source": source,
                        "chunk_id": self._chunk_seq,
                        "chunk_type": chunk_type,
                    }
                )
                current = current[-overlap_chars:] if len(current) > overlap_chars else current
            current += "\n\n" + para

        if current.strip():
            self._chunk_seq += 1
            chunks.append(
                {
                    "text": current.strip(),
                    "source": source,
                    "chunk_id": self._chunk_seq,
                    "chunk_type": chunk_type,
                }
            )

        return chunks

    def _build_vector_store(self):
        """Build FAISS vector store with OpenAI embeddings."""
        from app.config import settings

        if not settings.resolved_openai_api_key:
            raise ValueError("No OpenAI API key configured")

        from langchain_openai import OpenAIEmbeddings
        from langchain_community.vectorstores import FAISS
        from langchain_core.documents import Document

        docs = [
            Document(
                page_content=c["text"],
                metadata={
                    "source": c["source"],
                    "chunk_id": str(c.get("chunk_id", "")),
                    "chunk_type": c.get("chunk_type", "reference"),
                },
            )
            for c in self.chunks
        ]
        if not docs:
            raise ValueError("No documents to index")

        emb_kw = {"api_key": settings.resolved_openai_api_key}
        bu = settings.resolved_openai_base_url
        if bu:
            emb_kw["base_url"] = bu
        embeddings = OpenAIEmbeddings(**emb_kw)
        self.vector_store = FAISS.from_documents(docs, embeddings)
        logger.info("FAISS vector store built with %d documents", len(docs))

    def query(self, query: str, top_k: int = 3) -> list[str]:
        """Legacy: return text strings only (backward compatible)."""
        rows = self.retrieve(query, top_k=top_k, chunk_type_filter=None)
        return [r["text"] for r in rows]

    def retrieve(
        self,
        query: str,
        *,
        top_k: int = 5,
        chunk_type_filter: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Top-k retrieval from indexed PDF chunks with scores and metadata.

        Returns list of dicts: text, source, chunk_id, chunk_type, score.
        """
        q = (query or "").strip()
        if not q or not self.chunks:
            return []

        if self.vector_store:
            try:
                pairs = self.vector_store.similarity_search_with_score(q, k=min(top_k * 2, 50))
            except Exception as e:
                logger.warning("Vector retrieve failed: %s", e)
                pairs = []

            out: list[dict[str, Any]] = []
            for doc, dist in pairs:
                md = doc.metadata or {}
                ctype = md.get("chunk_type") or "reference"
                if chunk_type_filter and ctype != chunk_type_filter:
                    continue
                try:
                    sim = 1.0 / (1.0 + float(dist))
                except Exception:
                    sim = 0.0
                out.append(
                    {
                        "text": doc.page_content,
                        "source": md.get("source", ""),
                        "chunk_id": md.get("chunk_id", ""),
                        "chunk_type": ctype,
                        "score": round(float(sim), 4),
                    }
                )
                if len(out) >= top_k:
                    break
            if out:
                logger.info("KB retrieve: query=%r hits=%d", q[:120], len(out))
                return out

        query_lower = q.lower()
        scored = []
        for chunk in self.chunks:
            ctype = chunk.get("chunk_type", "reference")
            if chunk_type_filter and ctype != chunk_type_filter:
                continue
            text_lower = chunk["text"].lower()
            score = sum(1 for word in query_lower.split() if len(word) > 2 and word in text_lower)
            if score > 0:
                scored.append((score, chunk))

        scored.sort(key=lambda x: x[0], reverse=True)
        rows = []
        for score, chunk in scored[:top_k]:
            rows.append(
                {
                    "text": chunk["text"],
                    "source": chunk.get("source", ""),
                    "chunk_id": str(chunk.get("chunk_id", "")),
                    "chunk_type": chunk.get("chunk_type", "reference"),
                    "score": round(min(1.0, score / 10.0), 4),
                }
            )
        return rows

    def get_example_483(self) -> str:
        """Return example FDA 483 text for few-shot prompting."""
        return self._example_483_text

    def get_iom_guidance(self, section: str = "5.5.11") -> list[str]:
        """Get IOM guidance passages matching a section reference."""
        results = []
        for chunk in self.chunks:
            if section in chunk["text"] or "observation" in chunk["text"].lower():
                results.append(chunk["text"])
                if len(results) >= 3:
                    break
        return results
