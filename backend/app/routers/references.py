from __future__ import annotations

import re
from collections import Counter

from fastapi import APIRouter, Query

from app.config import settings

router = APIRouter()


def _extract_top_regulations(limit: int = 10) -> list[dict]:
    pdf_path = settings.data_path / "InvestigationsOperationsManualComplete.pdf"
    if not pdf_path.exists():
        return []

    try:
        import fitz
    except Exception:
        return []

    citation_pattern = re.compile(r"21\s*CFR\s*\d+(?:\.\d+)?(?:\([a-zA-Z0-9]+\))*", re.IGNORECASE)
    counter: Counter[str] = Counter()

    doc = fitz.open(pdf_path)
    try:
        for page in doc:
            text = page.get_text() or ""
            for match in citation_pattern.findall(text):
                normalized = re.sub(r"\s+", " ", match.strip()).upper()
                counter[normalized] += 1
    finally:
        doc.close()

    return [{"citation": citation, "count": count} for citation, count in counter.most_common(limit)]


@router.get("/top-regulations")
async def top_regulations(limit: int = Query(10, ge=1, le=25)):
    return {"items": _extract_top_regulations(limit=limit)}
