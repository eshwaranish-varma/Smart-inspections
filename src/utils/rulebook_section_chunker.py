"""
Rulebook Section Chunker - Step 2 of the Regulatory AI Pipeline.

Converts Step-1 pages JSONL into RAG-ready KB JSONL with section-aware chunking.
Detects CHAPTER/SUBCHAPTER headings, chunks by paragraphs with overlap, and emits
stable metadata for citations and retrieval.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import re
import sys
from pathlib import Path
from typing import Any, Iterator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

# Section detection patterns
CHAPTER_PATTERN = re.compile(
    r"^\s*CHAPTER\s+\d+(?:\s*[-–—:]\s*|\s+)(.+?)\s*$",
    re.IGNORECASE | re.MULTILINE,
)
SUBCHAPTER_PATTERN = re.compile(
    r"^\s*SUBCHAPTER\s+[\d.]+(?:\s*[-–—:]\s*|\s+)(.+?)\s*$",
    re.IGNORECASE | re.MULTILINE,
)


def _token_estimate(text: str) -> int:
    """Heuristic token estimate: ~4 chars per token."""
    return len(text) // 4 if text else 0


def _extract_section_from_line(line: str) -> tuple[str | None, str | None]:
    """
    Check if line is a CHAPTER or SUBCHAPTER heading.
    Returns (chapter_title, subchapter_title) - one may be None.
    """
    line_stripped = line.strip()
    if not line_stripped:
        return None, None

    chapter_match = CHAPTER_PATTERN.match(line_stripped)
    if chapter_match:
        title = chapter_match.group(1).strip()
        return f"CHAPTER {line_stripped.split(None, 2)[1]} - {title}", None

    subchapter_match = SUBCHAPTER_PATTERN.match(line_stripped)
    if subchapter_match:
        title = subchapter_match.group(1).strip()
        # Extract "5.1" or similar from "SUBCHAPTER 5.1"
        parts = line_stripped.split(None, 2)
        num = parts[1] if len(parts) > 1 else ""
        return None, f"SUBCHAPTER {num} - {title}"

    return None, None


def _detect_sections_in_text(text: str) -> list[tuple[str, str]]:
    """
    Scan text for CHAPTER and SUBCHAPTER headings.
    Returns list of (type, full_heading) for each found.
    """
    found: list[tuple[str, str]] = []
    for line in text.split("\n"):
        ch, subch = _extract_section_from_line(line)
        if ch:
            found.append(("chapter", ch))
        if subch:
            found.append(("subchapter", subch))
    return found


def _split_paragraphs(text: str) -> list[str]:
    """Split text into paragraphs by blank lines."""
    if not text or not text.strip():
        return []
    paras = re.split(r"\n\s*\n", text)
    return [p.strip() for p in paras if p.strip()]


def _split_sentences(text: str) -> list[str]:
    """Split text into sentences (simple heuristic)."""
    if not text or not text.strip():
        return []
    # Split on sentence boundaries
    parts = re.split(r"(?<=[.!?])\s+", text)
    return [p.strip() for p in parts if p.strip()]


def _compute_hash(text: str) -> str:
    """Compute SHA1 hash of text for deduplication/versioning."""
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


def load_pages_jsonl(
    path: Path,
    doc_id: str,
    max_pages: int | None = None,
) -> Iterator[dict[str, Any]]:
    """Load Step-1 pages JSONL, optionally filtered by doc_id and max_pages."""
    count = 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError as e:
                logger.warning("Skipping invalid JSON line: %s", e)
                continue
            if rec.get("doc_id") != doc_id:
                continue
            count += 1
            if max_pages and rec.get("page_number", 0) > max_pages:
                break
            yield rec


def chunk_content(
    text: str,
    max_tokens: int,
    overlap_tokens: int,
) -> list[str]:
    """
    Chunk text into segments of ~max_tokens with overlap_tokens overlap.
    Prefers paragraph boundaries; falls back to sentence splitting for large paragraphs.
    """
    paras = _split_paragraphs(text)
    if not paras:
        return [text] if text.strip() else []

    chunks: list[str] = []
    current_parts: list[str] = []
    current_tokens = 0
    overlap_chars = overlap_tokens * 4  # heuristic

    for para in paras:
        para_tokens = _token_estimate(para)
        if para_tokens > max_tokens:
            # Paragraph too large: split by sentences
            sentences = _split_sentences(para)
            for sent in sentences:
                sent_tokens = _token_estimate(sent)
                if current_tokens + sent_tokens > max_tokens and current_parts:
                    chunk_text = "\n\n".join(current_parts)
                    chunks.append(chunk_text)
                    # Overlap: take last overlap_chars from chunk
                    overlap_text = chunk_text[-overlap_chars:] if len(chunk_text) > overlap_chars else chunk_text
                    current_parts = [overlap_text] if overlap_text.strip() else []
                    current_tokens = _token_estimate(overlap_text)
                current_parts.append(sent)
                current_tokens += sent_tokens
        else:
            if current_tokens + para_tokens > max_tokens and current_parts:
                chunk_text = "\n\n".join(current_parts)
                chunks.append(chunk_text)
                overlap_text = chunk_text[-overlap_chars:] if len(chunk_text) > overlap_chars else chunk_text
                current_parts = [overlap_text] if overlap_text.strip() else []
                current_tokens = _token_estimate(overlap_text)
            current_parts.append(para)
            current_tokens += para_tokens

    if current_parts:
        chunks.append("\n\n".join(current_parts))

    return chunks


def process_pages_to_chunks(
    pages_iter: Iterator[dict[str, Any]],
    doc_id: str,
    source_pdf: str = "",
    max_tokens: int = 450,
    overlap_tokens: int = 60,
    min_chunk_chars: int = 150,
) -> Iterator[dict[str, Any]]:
    """
    Process page records into RAG-ready chunks with section metadata.
    """
    chapter: str | None = None
    subchapter: str | None = None
    section_path: list[str] = []
    section_title = ""
    chunk_index = 0
    resolved_source_pdf = source_pdf

    # Accumulate text across pages for chunking
    accumulated_text = ""
    page_start: int | None = None
    page_end: int | None = None
    methods: set[str] = set()

    for rec in pages_iter:
        if not resolved_source_pdf and rec.get("source_pdf"):
            resolved_source_pdf = rec.get("source_pdf", "")
        page_num = rec.get("page_number", 0)
        text = rec.get("text", "") or ""
        method = rec.get("method", "text")

        methods.add(method)

        # Detect sections in page text (check first few lines for headings)
        lines = text.split("\n")
        for line in lines[:15]:  # Check top of page for headings
            ch, subch = _extract_section_from_line(line)
            if ch:
                chapter = ch
                subchapter = None
                section_path = [chapter]
                section_title = chapter
            if subch:
                subchapter = subch
                section_path = [chapter, subchapter] if chapter else [subchapter]
                section_title = subchapter

        # Accumulate text
        if page_start is None:
            page_start = page_num
        page_end = page_num

        if text.strip():
            accumulated_text += ("\n\n" if accumulated_text else "") + text

        # Chunk when we have enough content
        tokens = _token_estimate(accumulated_text)
        if tokens >= max_tokens:
            sub_chunks = chunk_content(accumulated_text, max_tokens, overlap_tokens)
            for sc in sub_chunks:
                if len(sc) < min_chunk_chars:
                    continue
                chunk_id = f"{doc_id}::p{page_start}-{page_end}::c{chunk_index:05d}"
                token_est = _token_estimate(sc)
                method_summary = "mixed" if len(methods) > 1 else (next(iter(methods), "text"))

                yield {
                    "doc_id": doc_id,
                    "source_pdf": Path(resolved_source_pdf).name if resolved_source_pdf else "",
                    "section_title": section_title or "Unknown",
                    "section_path": section_path.copy(),
                    "page_start": page_start,
                    "page_end": page_end,
                    "chunk_id": chunk_id,
                    "text": sc,
                    "hash": _compute_hash(sc),
                    "token_estimate": token_est,
                    "method_summary": method_summary,
                }
                chunk_index += 1

            # Carry over overlap for next chunk
            if sub_chunks:
                last = sub_chunks[-1]
                overlap_chars = overlap_tokens * 4
                overlap_text = last[-overlap_chars:] if len(last) > overlap_chars else ""
                accumulated_text = overlap_text if overlap_text.strip() else ""
            else:
                accumulated_text = ""

            page_start = page_num if accumulated_text else None
            page_end = page_num if accumulated_text else None
            methods = {method} if accumulated_text else set()

    # Flush remaining
    if accumulated_text.strip() and len(accumulated_text) >= min_chunk_chars:
        chunk_id = f"{doc_id}::p{page_start}-{page_end}::c{chunk_index:05d}"
        token_est = _token_estimate(accumulated_text)
        method_summary = "mixed" if len(methods) > 1 else (next(iter(methods), "text"))
        yield {
            "doc_id": doc_id,
            "source_pdf": Path(resolved_source_pdf).name if resolved_source_pdf else "",
            "section_title": section_title or "Unknown",
            "section_path": section_path.copy(),
            "page_start": page_start or 0,
            "page_end": page_end or 0,
            "chunk_id": chunk_id,
            "text": accumulated_text.strip(),
            "hash": _compute_hash(accumulated_text.strip()),
            "token_estimate": token_est,
            "method_summary": method_summary,
        }
        chunk_index += 1


def run_chunker(
    input_path: Path,
    output_path: Path,
    doc_id: str,
    max_tokens: int = 450,
    overlap_tokens: int = 60,
    min_chunk_chars: int = 150,
    max_pages: int | None = None,
) -> dict[str, Any]:
    """
    Run the section chunker and write KB JSONL.
    Returns stats: total_chunks, sections_count, page_min, page_max, output_path.
    """
    pages_iter = load_pages_jsonl(input_path, doc_id, max_pages)
    chunks: list[dict[str, Any]] = []
    sections_seen: set[str] = set()
    page_min: int | None = None
    page_max: int | None = None

    for chunk in process_pages_to_chunks(
        pages_iter,
        doc_id=doc_id,
        source_pdf="",
        max_tokens=max_tokens,
        overlap_tokens=overlap_tokens,
        min_chunk_chars=min_chunk_chars,
    ):
        chunks.append(chunk)
        sections_seen.add(chunk.get("section_title", ""))
        p_start = chunk.get("page_start")
        p_end = chunk.get("page_end")
        if p_start is not None:
            page_min = p_start if page_min is None else min(page_min, p_start)
        if p_end is not None:
            page_max = p_end if page_max is None else max(page_max, p_end)

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        for chunk in chunks:
            f.write(json.dumps(chunk, ensure_ascii=False) + "\n")

    return {
        "total_chunks": len(chunks),
        "sections_count": len(sections_seen),
        "page_min": page_min,
        "page_max": page_max,
        "output_path": str(output_path),
    }


def main() -> int:
    """CLI entry point for rulebook section chunker."""
    parser = argparse.ArgumentParser(
        description="Section-aware chunking: convert Step-1 pages JSONL to RAG KB JSONL (Step 2)"
    )
    parser.add_argument("--in", dest="input_path", required=True, type=Path, help="Input pages JSONL path")
    parser.add_argument("--out", dest="output_path", required=True, type=Path, help="Output KB JSONL path")
    parser.add_argument("--doc-id", required=True, type=str, help="Document identifier")
    parser.add_argument("--max-tokens", default=450, type=int, help="Max tokens per chunk (default: 450)")
    parser.add_argument("--overlap-tokens", default=60, type=int, help="Overlap tokens between chunks (default: 60)")
    parser.add_argument(
        "--min-chunk-chars",
        default=150,
        type=int,
        help="Minimum chars to keep a chunk (default: 150)",
    )
    parser.add_argument("--max-pages", default=None, type=int, help="Max pages to process (for testing)")

    args = parser.parse_args()

    if not args.input_path.exists():
        logger.error("Input file not found: %s", args.input_path)
        return 1

    try:
        stats = run_chunker(
            input_path=args.input_path,
            output_path=args.output_path,
            doc_id=args.doc_id,
            max_tokens=args.max_tokens,
            overlap_tokens=args.overlap_tokens,
            min_chunk_chars=args.min_chunk_chars,
            max_pages=args.max_pages,
        )
    except Exception as e:
        logger.exception("Chunking failed: %s", e)
        return 1

    page_range = f"{stats['page_min']}-{stats['page_max']}" if stats.get("page_min") is not None and stats.get("page_max") is not None else "N/A"
    logger.info(
        "Chunking complete: %d chunks, %d sections, pages %s -> %s",
        stats["total_chunks"],
        stats["sections_count"],
        page_range,
        stats["output_path"],
    )
    print(f"Total chunks: {stats['total_chunks']}")
    print(f"Sections detected: {stats['sections_count']}")
    print(f"Page range: {page_range}")
    print(f"Output: {stats['output_path']}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
