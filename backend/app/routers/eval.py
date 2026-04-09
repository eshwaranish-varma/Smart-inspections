from fastapi import APIRouter, HTTPException, Query

from app.evaluation import aggregate_metrics, get_evaluation_by_id, list_evaluation_summaries, load_evaluations

router = APIRouter()


@router.get("/metrics")
async def get_metrics():
    records = load_evaluations()
    return aggregate_metrics(records)


@router.get("/documents")
async def list_evaluation_documents(
    title: str | None = Query(None, description="Case-insensitive substring match on inspection assignment title"),
    inspection_id: str | None = Query(None, description="Exact workflow inspection UUID"),
    limit: int = Query(100, ge=1, le=500),
):
    """List evaluation runs (newest first). Filter by inspection title and/or inspection id."""
    return list_evaluation_summaries(
        title_query=title,
        inspection_id=inspection_id,
        limit=limit,
    )


@router.get("/documents/{doc_id}")
async def get_evaluation_document(doc_id: str):
    rec = get_evaluation_by_id(doc_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Evaluation not found")
    return {
        "draft": rec.get("output"),
        "evaluation": rec.get("scores"),
        "input": rec.get("input"),
        "doc_id": rec.get("doc_id"),
        "created_at": rec.get("created_at"),
        "inspection_id": rec.get("inspection_id"),
        "inspection_title": rec.get("inspection_title"),
    }
