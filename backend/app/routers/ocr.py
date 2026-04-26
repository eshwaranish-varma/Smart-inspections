from fastapi import APIRouter, UploadFile, File, Form
from app.services.ocr_service import OCRService

# /api/ocr — must not use an empty path on an un-prefixed router (FastAPI: "Prefix and path cannot be both empty").
router = APIRouter(prefix="/api/ocr", tags=["OCR"])


@router.post("/")
async def process_ocr(
    file: UploadFile = File(...),
    is_handwritten: bool = Form(False),
):
    content = await file.read()
    
    if file.content_type and "pdf" in file.content_type:
        result = OCRService.process_pdf(content)
    else:
        result = OCRService.process_image(content, is_handwritten=is_handwritten)
    
    return result
