from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from io import BytesIO

from app.schemas.inspection import GenerateDocumentRequest, GenerateEIRRequest, EIRNarrative, InspectionMetadata, DraftObservation
from app.services.document_service import DocumentService

router = APIRouter()


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
    narrative = EIRNarrative(observations_summary="Auto-generated from observations")
    doc_bytes = DocumentService.generate_eir_document(narrative, req.form_data)
    return StreamingResponse(
        BytesIO(doc_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": "attachment; filename=EIR_Narrative.docx"},
    )


@router.post("/generate-both")
async def generate_both(req: GenerateDocumentRequest):
    narrative = EIRNarrative(observations_summary="Auto-generated from observations")
    zip_bytes = DocumentService.generate_both(req.form_data, req.observations, narrative)
    return StreamingResponse(
        BytesIO(zip_bytes),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=FDA_Documents.zip"},
    )
