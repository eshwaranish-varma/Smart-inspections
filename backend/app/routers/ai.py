from fastapi import APIRouter, HTTPException
from app.schemas.inspection import (
    GenerateObservationsRequest, GenerateObservationsResponse,
    GenerateEIRRequest, EIRNarrative, RefineObservationRequest,
    DraftObservation, ValidationResult, ExtractMetadataRequest, ExtractMetadataResponse,
)
from app.services.ai_service import AIService
from app.services.citation_service import CitationService
from app.config import settings

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


@router.post("/generate-observations", response_model=GenerateObservationsResponse)
async def generate_observations(req: GenerateObservationsRequest):
    ai = _get_ai_service()
    citation_service = CitationService(settings.title21_sections_csv)
    
    from app.deps import get_kb
    kb = get_kb()
    kb_context = kb.query(req.raw_notes[:500]) if kb and kb.is_initialized else []
    example_483 = kb.get_example_483() if kb else ""
    
    try:
        observations = ai.generate_observations(
            raw_notes=req.raw_notes,
            establishment_type=req.establishment_type,
            cfr_parts=req.cfr_parts,
            kb_context=kb_context,
            example_483=example_483,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    matched_refs: list[dict] = []
    for obs in observations:
        match = citation_service.best_match(obs.cfr_citation)
        if match:
            obs.matched_citation = match["citation"]
            obs.citation_title = match["section_title"] or match["section_label"]
            obs.citation_match_score = match["score"]
            matched_refs.append(match)

    return GenerateObservationsResponse(
        observations=observations,
        knowledge_base_refs=kb_context[:2],
        citation_refs=matched_refs[:10],
    )


@router.post("/generate-eir", response_model=EIRNarrative)
async def generate_eir(req: GenerateEIRRequest):
    ai = _get_ai_service()
    try:
        return ai.generate_eir_narrative(
            observations=req.observations,
            inspection_metadata=req.inspection_metadata.model_dump(),
            raw_notes=req.raw_notes,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"EIR generation failed: {str(e)}")


@router.post("/refine-observation", response_model=DraftObservation)
async def refine_observation(req: RefineObservationRequest):
    ai = _get_ai_service()
    try:
        return ai.refine_observation(req.observation, req.user_feedback)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate-observation", response_model=ValidationResult)
async def validate_observation(obs: DraftObservation):
    ai = _get_ai_service()
    return ai.validate_observation(obs)


@router.post("/extract-metadata", response_model=ExtractMetadataResponse)
async def extract_metadata(req: ExtractMetadataRequest):
    ai = _get_ai_service()
    try:
        metadata = ai.extract_inspection_metadata(req.raw_text)
        return ExtractMetadataResponse(metadata=metadata)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metadata extraction failed: {str(e)}")
