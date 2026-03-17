from fastapi import APIRouter, Query

from app.config import settings
from app.services.citation_service import CitationService

router = APIRouter()


@router.get("/search")
async def search_citations(
    q: str = Query("", description="Search by citation or section title"),
    limit: int = Query(10, ge=1, le=50),
):
    service = CitationService(settings.title21_sections_csv)
    return service.search(query=q, limit=limit)
