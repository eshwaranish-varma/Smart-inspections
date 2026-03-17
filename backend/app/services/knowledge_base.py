from __future__ import annotations
import logging
import re
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class KnowledgeBaseService:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.is_initialized = False
        self.chunks: list[dict] = []
        self.vector_store = None
        self._example_483_text: str = ""

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

        new_chunks = self._chunk_text(full_text, source=path.name)
        self.chunks.extend(new_chunks)
        logger.info("Ingested %s: %d chunks", path.name, len(new_chunks))

    def _chunk_text(
        self,
        text: str,
        source: str,
        max_chars: int = 2000,
        overlap_chars: int = 200,
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
                chunks.append({"text": current.strip(), "source": source})
                current = current[-overlap_chars:] if len(current) > overlap_chars else current
            current += "\n\n" + para

        if current.strip():
            chunks.append({"text": current.strip(), "source": source})

        return chunks

    def _build_vector_store(self):
        """Build FAISS vector store with OpenAI embeddings."""
        from app.config import settings

        if not settings.openai_api_key:
            raise ValueError("No OpenAI API key configured")

        from langchain_openai import OpenAIEmbeddings
        from langchain_community.vectorstores import FAISS
        from langchain_core.documents import Document

        docs = [
            Document(page_content=c["text"], metadata={"source": c["source"]})
            for c in self.chunks
        ]
        if not docs:
            raise ValueError("No documents to index")

        embeddings = OpenAIEmbeddings(api_key=settings.openai_api_key)
        self.vector_store = FAISS.from_documents(docs, embeddings)
        logger.info("FAISS vector store built with %d documents", len(docs))

    def query(self, query: str, top_k: int = 3) -> list[str]:
        """Query the knowledge base; falls back to keyword search if no vector store."""
        if self.vector_store:
            try:
                results = self.vector_store.similarity_search(query, k=top_k)
                return [r.page_content for r in results]
            except Exception as e:
                logger.warning("Vector search failed: %s", e)

        query_lower = query.lower()
        scored = []
        for chunk in self.chunks:
            text_lower = chunk["text"].lower()
            score = sum(1 for word in query_lower.split() if word in text_lower)
            if score > 0:
                scored.append((score, chunk["text"]))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [text for _, text in scored[:top_k]]

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
