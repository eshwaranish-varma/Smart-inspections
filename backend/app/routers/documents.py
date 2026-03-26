from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from io import BytesIO

from app.config import settings
from app.deps import get_kb
from app.schemas.inspection import GenerateDocumentRequest, EIRNarrative
from app.services.ai_service import AIService
from app.services.document_service import DocumentService

router = APIRouter()


def _get_ai_service() -> AIService:
    return AIService(
        provider=settings.llm_provider,
        api_key=settings.openai_api_key,
        google_api_key=settings.google_api_key,
        model=settings.openai_model,
        google_model=settings.google_model,
        temperature=settings.openai_temperature,
    )


def _build_eir_narrative(req: GenerateDocumentRequest) -> EIRNarrative:
    """Use the same AI pipeline as POST /api/ai/generate-eir so the Word doc matches draft content."""
    ai = _get_ai_service()
    kb = get_kb()
    combined = (req.raw_notes or "") + "\n" + "\n".join(o.observation_text for o in req.observations)
    kb_context = kb.query(combined[:1200]) if kb and kb.is_initialized else []
    try:
        return ai.generate_eir_narrative(
            observations=req.observations,
            inspection_metadata=req.form_data.model_dump(),
            raw_notes=req.raw_notes or "",
            kb_context=kb_context,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"EIR narrative generation failed: {e}")


@router.post("/generate-483")
async def generate_483(req: GenerateDocumentRequest):
    doc_bytes = DocumentService.generate_483_document(req.form_data, req.observations)
    return StreamingResponse(
        BytesIO(doc_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": "attachment; filename=FDA_483.docx"},
    )


@router.post("/generate-eir")
async def generate_eir(req: GenerateDocumentRequest):
    narrative = _build_eir_narrative(req)
    doc_bytes = DocumentService.generate_eir_document(narrative, req.form_data, req.observations)
    return StreamingResponse(
        BytesIO(doc_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": "attachment; filename=EIR_Narrative.docx"},
    )


@router.post("/generate-both")
async def generate_both(req: GenerateDocumentRequest):
    narrative = _build_eir_narrative(req)
    zip_bytes = DocumentService.generate_both(req.form_data, req.observations, narrative)
    return StreamingResponse(
        BytesIO(zip_bytes),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=FDA_Documents.zip"},
    )
