import csv
from io import BytesIO, StringIO
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.config import settings

router = APIRouter(prefix="/observations", tags=["Observations"])


def _title21_csv_path() -> Path:
    return settings.title21_sections_csv


def _section_display(row: dict[str, Any]) -> str:
    for key in ("section_label", "section_title", "part_label"):
        value = (row.get(key) or "").strip()
        if value:
            return value
    return ""


def _normalize_row(row: dict[str, Any], row_id: int) -> dict[str, str]:
    section_level = (row.get("section_level") or "").strip()
    if not section_level:
        # Fallback for datasets that use section number in this column.
        section_level = (row.get("section_number") or "").strip()

    return {
        "id": str(row_id),
        "citation": (row.get("citation") or "").strip(),
        "section_level": section_level,
        "section_display": _section_display(row),
    }


def _load_rows() -> list[dict[str, str]]:
    csv_path = _title21_csv_path()
    if not csv_path.exists():
        return []

    rows: list[dict[str, str]] = []
    with csv_path.open("r", encoding="utf-8", newline="") as fp:
        reader = csv.DictReader(fp)
        for idx, row in enumerate(reader, start=1):
            normalized = _normalize_row(row, idx)
            # Keep only rows with at least one meaningful field.
            if normalized["citation"] or normalized["section_display"] or normalized["section_level"]:
                rows.append(normalized)
    return rows


@router.get("")
async def list_observations(
    q: str = Query("", description="Search query"),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    establishment_type: str = Query("", description="Filter by section level"),
):
    all_rows = _load_rows()
    query = q.lower().strip()
    section_filter = establishment_type.lower().strip()

    filtered: list[dict[str, str]] = []
    for row in all_rows:
        if section_filter and row.get("section_level", "").lower() != section_filter:
            continue
        if query:
            haystack = " ".join([row.get("citation", ""), row.get("section_level", ""), row.get("section_display", "")]).lower()
            if query not in haystack:
                continue
        filtered.append(row)

    all_obs = filtered
    total = len(all_obs)
    start = (page - 1) * per_page
    end = start + per_page

    return {
        "items": all_obs[start:end],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.get("/stats")
async def observation_stats():
    rows = _load_rows()
    by_section_level: dict[str, int] = {}
    by_citation: dict[str, int] = {}

    for row in rows:
        section_level = row.get("section_level", "") or "Unknown"
        by_section_level[section_level] = by_section_level.get(section_level, 0) + 1

        citation = row.get("citation", "")
        if citation:
            by_citation[citation] = by_citation.get(citation, 0) + 1

    top_citations = sorted(by_citation.items(), key=lambda item: item[1], reverse=True)[:10]
    return {
        "total": len(rows),
        "by_establishment_type": by_section_level,  # kept for existing frontend shape
        "by_cfr_part": by_citation,
        "top_citations": [{"citation": citation, "count": count} for citation, count in top_citations],
        "column_names": ["citation", "section_level", "section_display"],
    }


@router.get("/search")
async def search_observations(q: str = Query(..., description="Search query")):
    rows = _load_rows()
    query = q.lower().strip()
    if not query:
        return rows[:100]
    return [
        row
        for row in rows
        if query in " ".join([row.get("citation", ""), row.get("section_level", ""), row.get("section_display", "")]).lower()
    ][:200]


@router.post("")
async def add_observation(data: dict):
    # Title 21 citation dataset is read-only; keep endpoint for UI compatibility.
    return {"success": False, "message": "Title 21 sections dataset is read-only."}


@router.get("/export")
async def export_observations(q: str = Query("", description="Search query")):
    rows = _load_rows()
    query = q.lower().strip()
    filtered = rows if not query else [
        row
        for row in rows
        if query in " ".join([row.get("citation", ""), row.get("section_level", ""), row.get("section_display", "")]).lower()
    ]

    output = StringIO()
    fieldnames = ["id", "citation", "section_level", "section_display"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(filtered)
    excel_bytes = output.getvalue().encode("utf-8")
    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=title21_sections_export.csv"},
    )
