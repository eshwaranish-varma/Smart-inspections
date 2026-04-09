from fastapi import APIRouter, Query

from app.config import settings
from app.services.citation_service import CitationService

router = APIRouter()


def _citation_service() -> CitationService:
    return CitationService(
        settings.title21_sections_csv,
        xml_dir=settings.title21_xml_directory,
        match_threshold=settings.citation_match_threshold,
        database_url=settings.effective_database_url,
        title21_source=settings.title21_source,
        title21_table=settings.title21_table,
        cfr_match_mode=settings.cfr_match_mode,
        cfr_confidence_threshold=settings.cfr_confidence_threshold,
        cfr_top_k=settings.cfr_top_k,
        cfr_embedding_model=settings.cfr_embedding_model,
        cfr_index_dir=settings.cfr_index_path,
    )


@router.get("/search")
async def search_citations(
    q: str = Query("", description="Search by citation or section title"),
    limit: int = Query(10, ge=1, le=50),
):
    return _citation_service().search(query=q, limit=limit)


@router.get("/status")
async def citations_status():
    """Reports whether Title 21 citations are loaded from Supabase (public.title_21_sections) or local files."""
    return _citation_service().status()
