"""Inspection-level evaluation dashboard (aggregates per-doc AI evaluation runs)."""

from fastapi import APIRouter

from app.services.evaluation_service import build_inspection_evaluation_response

router = APIRouter()


@router.get("/{inspection_id}")
async def get_inspection_evaluation_dashboard(inspection_id: str):
    data = build_inspection_evaluation_response(inspection_id)
    return {
        "ocr_accuracy": data["ocr_accuracy"],
        "cfr_match_score": data["cfr_match_score"],
        "evidence_coverage": data["evidence_coverage"],
        "hallucination_flags": data["hallucination_flags"],
        "template_score": data["template_score"],
        "overall_score": data["overall_score"],
        "inspection_id": data["inspection_id"],
        "per_document": data.get("per_document", []),
        "explanations": data.get("explanations", {}),
    }
