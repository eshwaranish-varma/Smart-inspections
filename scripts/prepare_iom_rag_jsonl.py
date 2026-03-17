#!/usr/bin/env python3
"""
Prepare IOM page-level JSONL into RAG-ready, section-aware chunk JSONL.

Input JSONL schema (minimum):
{
  "doc_id": "iom-2025",
  "page_number": 12,
  "text": "...",
  "source_pdf": "...",   # optional
  "method": "..."        # optional
}

Output JSONL schema (per chunk):
{
  "doc_id": "iom-2025",
  "chunk_id": "iom-2025|CHAPTER 5|SUBCHAPTER 5.7|5.7.2.1 – Something|0003",
  "section_path": ["CHAPTER 5", "SUBCHAPTER 5.7", "5.7.2.1"],
  "title": "5.7.2.1 – Something",
  "text": "...cleaned chunk text...",
  "page_start": 90,
  "page_end": 92,
  "source_pdf": "..."     # if present in input
}
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from statistics import mean
from typing import Any, Dict, Iterable, List, Optional, Tuple


# -----------------------------
# Heading detection (IOM-like)
# -----------------------------
CHAPTER_RE = re.compile(r"^\s*CHAPTER\s+(?P<num>\d+)\b", re.IGNORECASE)
SUBCHAPTER_RE = re.compile(r"^\s*SUBCHAPTER\s+(?P<num>\d+(?:\.\d+)+)\b", re.IGNORECASE)
NUMBERED_RE = re.compile(r"^\s*(?P<num>\d+(?:\.\d+){1,6})\s*[–—-]\s*(?P<title>.+?)\s*$")

# Common noise patterns
PAGE_NUM_ONLY_RE = re.compile(r"^\s*\d{1,4}\s*$")
IOM_BOILER_RE = re.compile(r"INVESTIGATIONS\s+OPERATIONS\s+MANUAL\s+2025", re.IGNORECASE)


def safe_jsonl_read(path: Path) -> Iterable[Dict[str, Any]]:
    """Yield JSON objects from a JSONL file; skip bad lines but continue."""
    with path.open("r", encoding="utf-8") as f:
        for idx, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                if isinstance(obj, dict):
                    yield obj
            except json.JSONDecodeError:
                # skip bad line
                continue


def normalize_text(text: str) -> str:
    """Basic cleanup for born-digital or OCR-ish text."""
    if not text:
        return ""

    # Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Fix hyphenation across line breaks: "regula-\ntion" -> "regulation"
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)

    out_lines: List[str] = []
    for line in text.split("\n"):
        raw = line.strip()
        if not raw:
            out_lines.append("")
            continue

        # Drop common boilerplate lines
        if PAGE_NUM_ONLY_RE.match(raw):
            continue
        if IOM_BOILER_RE.search(raw):
            continue

        # Collapse internal whitespace
        raw = re.sub(r"\s+", " ", raw)
        out_lines.append(raw)

    cleaned = "\n".join(out_lines)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned


def detect_heading(line: str) -> Optional[Dict[str, str]]:
    """Return heading info if the line is a heading; else None."""
    m = CHAPTER_RE.match(line)
    if m:
        num = m.group("num")
        return {"kind": "chapter", "id": f"CHAPTER {num}", "title": f"CHAPTER {num}"}

    m = SUBCHAPTER_RE.match(line)
    if m:
        num = m.group("num")
        return {"kind": "subchapter", "id": f"SUBCHAPTER {num}", "title": f"SUBCHAPTER {num}"}

    m = NUMBERED_RE.match(line)
    if m:
        num = m.group("num")
        title = m.group("title").strip()
        return {"kind": "numbered", "id": num, "title": f"{num} – {title}"}

    return None


def chunk_text(text: str, max_chars: int, overlap_chars: int) -> List[str]:
    """
    Char-based chunking with overlap.
    (Later you can swap to token-based chunking without changing the rest of the pipeline.)
    """
    text = text.strip()
    if not text:
        return []

    chunks: List[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(n, start + max_chars)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= n:
            break
        start = max(0, end - overlap_chars)
    return chunks


@dataclass
class SectionBuffer:
    chapter: Optional[str] = None
    subchapter: Optional[str] = None
    numbered: Optional[str] = None
    title: Optional[str] = None
    text_parts: List[str] = field(default_factory=list)
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    source_pdf: Optional[str] = None

    def path(self) -> List[str]:
        p: List[str] = []
        if self.chapter:
            p.append(self.chapter)
        if self.subchapter:
            p.append(self.subchapter)
        if self.numbered:
            p.append(self.numbered)
        return p

    def clear_text(self) -> None:
        self.text_parts = []
        self.page_start = None
        self.page_end = None
        self.title = None
        self.numbered = None


def build_chunks_from_pages(
    pages: List[Dict[str, Any]],
    doc_id_default: str,
    max_chars: int,
    overlap_chars: int,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Convert page-level JSON objects to section-aware chunk records.
    Returns (chunks, stats).
    """
    # Sort pages by page_number if present
    def page_key(p: Dict[str, Any]) -> int:
        pn = p.get("page_number")
        if isinstance(pn, int):
            return pn
        return 10**9

    pages_sorted = sorted(pages, key=page_key)

    buf = SectionBuffer()
    chunks_out: List[Dict[str, Any]] = []

    pages_read = 0
    empty_pages_skipped = 0
    sections_flushed = 0
    chunk_sizes: List[int] = []

    def flush_section() -> None:
        nonlocal sections_flushed
        if not buf.text_parts:
            return

        full_text = normalize_text("\n".join(buf.text_parts))
        if not full_text:
            # keep hierarchy context, discard empty content
            buf.text_parts = []
            return

        section_path = buf.path()
        chunk_list = chunk_text(full_text, max_chars=max_chars, overlap_chars=overlap_chars)

        # Make a readable stable id component; keep it compact
        # (We keep the "numbered" as just the numeric id in section_path, and use buf.title separately.)
        base_id_parts = [doc_id_default] + section_path

        for i, ch in enumerate(chunk_list):
            cid = "|".join(base_id_parts + [f"{i:04d}"])
            rec: Dict[str, Any] = {
                "doc_id": doc_id_default,
                "chunk_id": cid,
                "section_path": section_path,
                "title": buf.title or (section_path[-1] if section_path else None),
                "text": ch,
                "page_start": buf.page_start,
                "page_end": buf.page_end,
            }
            if buf.source_pdf:
                rec["source_pdf"] = buf.source_pdf
            chunks_out.append(rec)
            chunk_sizes.append(len(ch))

        sections_flushed += 1
        # Reset content but keep chapter/subchapter context
        prev_chapter = buf.chapter
        prev_subchapter = buf.subchapter
        prev_source_pdf = buf.source_pdf
        buf.clear_text()
        buf.chapter = prev_chapter
        buf.subchapter = prev_subchapter
        buf.source_pdf = prev_source_pdf

    for p in pages_sorted:
        pages_read += 1
        doc_id = p.get("doc_id") if isinstance(p.get("doc_id"), str) else doc_id_default
        text = p.get("text") if isinstance(p.get("text"), str) else ""
        page_number = p.get("page_number")
        source_pdf = p.get("source_pdf") if isinstance(p.get("source_pdf"), str) else None

        if not text.strip():
            empty_pages_skipped += 1
            continue

        # lock doc_id/source_pdf into buffer
        doc_id_default = doc_id
        if source_pdf and not buf.source_pdf:
            buf.source_pdf = source_pdf

        # Normalize minimally for line scanning (don't remove headings prematurely)
        # (We still normalize later at flush time.)
        scan_text = text.replace("\r\n", "\n").replace("\r", "\n")
        lines = scan_text.split("\n")

        for raw_line in lines:
            line = raw_line.strip()
            if not line:
                buf.text_parts.append("")
                continue

            heading = detect_heading(line)
            if heading:
                # Boundary -> flush current section
                flush_section()

                kind = heading["kind"]
                hid = heading["id"]
                htitle = heading["title"]

                if kind == "chapter":
                    buf.chapter = hid
                    buf.subchapter = None
                    buf.numbered = None
                    buf.title = htitle
                elif kind == "subchapter":
                    buf.subchapter = hid
                    buf.numbered = None
                    buf.title = htitle
                else:
                    buf.numbered = hid
                    buf.title = htitle

                # Start new section page span
                if isinstance(page_number, int):
                    buf.page_start = page_number
                    buf.page_end = page_number
                else:
                    # still allow chunking, but without reliable page span
                    buf.page_start = buf.page_start or None
                    buf.page_end = buf.page_end or None

                # Keep the heading line in text (helpful for retrieval)
                buf.text_parts.append(line)
                continue

            # Normal content line
            if isinstance(page_number, int):
                if buf.page_start is None:
                    buf.page_start = page_number
                buf.page_end = page_number
            buf.text_parts.append(raw_line)

    # final flush
    flush_section()

    stats = {
        "pages_read": pages_read,
        "empty_pages_skipped": empty_pages_skipped,
        "sections_created": sections_flushed,
        "chunks_created": len(chunks_out),
        "avg_chunk_chars": round(mean(chunk_sizes), 2) if chunk_sizes else 0,
        "max_chunk_chars": max(chunk_sizes) if chunk_sizes else 0,
        "min_chunk_chars": min(chunk_sizes) if chunk_sizes else 0,
        "doc_id": doc_id_default,
    }
    return chunks_out, stats


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True, help="Input pages JSONL (e.g., sources/iom-2025.pages.jsonl)")
    ap.add_argument("--out", dest="out", required=True, help="Output RAG JSONL (e.g., artifacts/iom-2025.rag.jsonl)")
    ap.add_argument("--doc-id", dest="doc_id", default="iom-2025", help="Default doc_id if not present in input")
    ap.add_argument("--max-chars", type=int, default=4500, help="Max chars per chunk")
    ap.add_argument("--overlap-chars", type=int, default=600, help="Overlap chars between chunks")
    ap.add_argument("--stats-out", dest="stats_out", default=None, help="Optional stats JSON path")
    args = ap.parse_args()

    in_path = Path(args.inp)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    stats_path = Path(args.stats_out) if args.stats_out else out_path.with_suffix(".stats.json")

    pages = list(safe_jsonl_read(in_path))
    chunks, stats = build_chunks_from_pages(
        pages=pages,
        doc_id_default=args.doc_id,
        max_chars=args.max_chars,
        overlap_chars=args.overlap_chars,
    )

    with out_path.open("w", encoding="utf-8") as f:
        for rec in chunks:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    with stats_path.open("w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)

    print(f"[OK] Wrote chunks: {out_path}")
    print(f"[OK] Wrote stats : {stats_path}")
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
