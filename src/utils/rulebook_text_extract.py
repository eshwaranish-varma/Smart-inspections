"""
Rulebook Text Extraction - Step 1 of the Regulatory AI Pipeline.

Extracts text from PDF regulatory manuals (FDA rulebooks, IOM, inspection manuals).
Uses PyMuPDF for native text extraction with automatic OCR fallback for scanned pages.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
from pathlib import Path
from typing import Any

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None  # type: ignore[assignment]

try:
    import pytesseract
    from PIL import Image
    # Allow Tesseract path override when not on PATH (e.g. Windows)
    tesseract_cmd = os.environ.get("TESSERACT_CMD")
    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
except ImportError:
    pytesseract = None  # type: ignore[assignment]
    Image = None  # type: ignore[assignment]

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


def _clean_whitespace(text: str) -> str:
    """Normalize and clean whitespace in extracted text."""
    if not text or not isinstance(text, str):
        return ""
    # Replace multiple spaces/newlines with single space, strip
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _extract_text_pymupdf(page: "fitz.Page") -> str:
    """Extract text from a PyMuPDF page using native text extraction."""
    try:
        return page.get_text() or ""
    except Exception as e:
        logger.warning("PyMuPDF text extraction failed: %s", e)
        return ""


def _render_page_to_image(page: "fitz.Page", dpi: int = 300) -> "Image.Image":
    """Render a PDF page to a PIL Image for OCR."""
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img = Image.frombytes(
        "RGB",
        [pix.width, pix.height],
        pix.samples,
    )
    return img


def _ocr_page(page: "fitz.Page", lang: str = "eng", dpi: int = 300) -> str:
    """Run OCR on a rendered page image using Tesseract."""
    if pytesseract is None or Image is None:
        raise RuntimeError("pytesseract and Pillow are required for OCR. Install with: pip install pytesseract Pillow")
    img = _render_page_to_image(page, dpi=dpi)
    try:
        text = pytesseract.image_to_string(img, lang=lang)
        return text or ""
    except Exception as e:
        logger.warning("OCR failed for page: %s", e)
        return ""


def extract_page(
    page: "fitz.Page",
    page_number: int,
    *,
    use_ocr: bool = True,
    min_text_chars: int = 40,
    ocr_lang: str = "eng",
    ocr_dpi: int = 300,
) -> tuple[str, str]:
    """
    Extract text from a single PDF page.

    Returns:
        Tuple of (extracted_text, method) where method is "text" or "ocr".
    """
    text_extracted = _extract_text_pymupdf(page)
    text_extracted = _clean_whitespace(text_extracted)

    if not use_ocr:
        return text_extracted, "text"

    # Treat as scanned if text length is below threshold
    if len(text_extracted) < min_text_chars:
        try:
            ocr_text = _ocr_page(page, lang=ocr_lang, dpi=ocr_dpi)
            ocr_text = _clean_whitespace(ocr_text)
            # Keep whichever result is longer
            if len(ocr_text) > len(text_extracted):
                return ocr_text, "ocr"
        except RuntimeError as e:
            logger.warning("OCR skipped for page %d: %s", page_number, e)

    return text_extracted, "text"


def extract_pdf(
    pdf_path: str | Path,
    doc_id: str,
    *,
    use_ocr: bool = True,
    min_text_chars: int = 40,
    ocr_lang: str = "eng",
    ocr_dpi: int = 300,
    max_pages: int | None = None,
) -> list[dict[str, Any]]:
    """
    Extract text from all pages of a PDF.

    Returns:
        List of page dicts with keys: page_number, method, text
    """
    if fitz is None:
        raise RuntimeError("PyMuPDF (fitz) is required. Install with: pip install pymupdf")

    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    pages_data: list[dict[str, Any]] = []
    source_pdf_str = str(pdf_path.resolve())

    with fitz.open(pdf_path) as doc:
        total_pages = len(doc)
        pages_to_process = min(total_pages, max_pages) if max_pages else total_pages

        for i in range(pages_to_process):
            page = doc[i]
            page_number = i + 1
            text, method = extract_page(
                page,
                page_number,
                use_ocr=use_ocr,
                min_text_chars=min_text_chars,
                ocr_lang=ocr_lang,
                ocr_dpi=ocr_dpi,
            )
            pages_data.append({
                "page_number": page_number,
                "method": method,
                "text": text,
            })

    return pages_data


def write_output(
    pages_data: list[dict[str, Any]],
    output_path: Path,
    doc_id: str,
    source_pdf: str,
) -> None:
    """Write extracted data to JSON or JSONL file."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if output_path.suffix.lower() == ".jsonl":
        with open(output_path, "w", encoding="utf-8") as f:
            for page in pages_data:
                record = {
                    "doc_id": doc_id,
                    "source_pdf": source_pdf,
                    "page_number": page["page_number"],
                    "method": page["method"],
                    "text": page["text"],
                }
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
    else:
        output = {
            "doc_id": doc_id,
            "source_pdf": source_pdf,
            "total_pages_extracted": len(pages_data),
            "pages": pages_data,
        }
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)


def main() -> int:
    """CLI entry point for rulebook text extraction."""
    parser = argparse.ArgumentParser(
        description="Extract text from PDF regulatory manuals (Step 1 of Regulatory AI Pipeline)"
    )
    parser.add_argument(
        "--pdf",
        required=True,
        type=Path,
        help="Path to input PDF file",
    )
    parser.add_argument(
        "--doc-id",
        required=True,
        type=str,
        help="Document identifier for output",
    )
    parser.add_argument(
        "--out",
        required=True,
        type=Path,
        help="Output path (.json or .jsonl)",
    )
    parser.add_argument(
        "--no-ocr",
        action="store_true",
        help="Disable OCR fallback for scanned pages",
    )
    parser.add_argument(
        "--ocr-lang",
        default="eng",
        type=str,
        help="Tesseract OCR language code (default: eng)",
    )
    parser.add_argument(
        "--ocr-dpi",
        default=300,
        type=int,
        help="DPI for page rendering during OCR (default: 300)",
    )
    parser.add_argument(
        "--min-text-chars",
        default=40,
        type=int,
        help="Minimum text length to consider page as non-scanned (default: 40)",
    )
    parser.add_argument(
        "--max-pages",
        default=None,
        type=int,
        help="Maximum number of pages to process (default: all)",
    )
    parser.add_argument(
        "--tesseract-cmd",
        default=None,
        type=str,
        help="Path to tesseract.exe (or use TESSERACT_CMD env var) when not on PATH",
    )

    args = parser.parse_args()

    # Override Tesseract path from CLI if provided
    if args.tesseract_cmd and pytesseract is not None:
        pytesseract.pytesseract.tesseract_cmd = args.tesseract_cmd

    try:
        pages_data = extract_pdf(
            args.pdf,
            args.doc_id,
            use_ocr=not args.no_ocr,
            min_text_chars=args.min_text_chars,
            ocr_lang=args.ocr_lang,
            ocr_dpi=args.ocr_dpi,
            max_pages=args.max_pages,
        )
    except (RuntimeError, FileNotFoundError) as e:
        logger.error("%s", e)
        return 1

    source_pdf_str = str(Path(args.pdf).resolve())
    write_output(pages_data, args.out, args.doc_id, source_pdf_str)

    text_pages = sum(1 for p in pages_data if p["method"] == "text")
    ocr_pages = sum(1 for p in pages_data if p["method"] == "ocr")

    logger.info(
        "Extraction complete: %d pages total (%d text, %d OCR) -> %s",
        len(pages_data),
        text_pages,
        ocr_pages,
        args.out,
    )
    print(f"Summary: {len(pages_data)} pages extracted ({text_pages} text, {ocr_pages} OCR) -> {args.out}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
