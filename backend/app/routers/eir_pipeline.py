"""Strict 1:1 EIR generation from Form FDA 483 observations (separate from POST /api/ai/generate-eir)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.inspection import DraftObservation, GenerateEIROneToOneBody, GenerateEIROneToOneResponse, EIROneToOneSection
from app.services.eir_pipeline import generate_eir_from_483, observation_from_draft

router = APIRouter()


def _drafts_to_observations(drafts: list[DraftObservation]) -> list:
    return [observation_from_draft(o, i + 1) for i, o in enumerate(drafts)]


@router.post(
    "/inspections/{inspection_id}/generate-eir-from-483",
    response_model=GenerateEIROneToOneResponse,
)
async def generate_eir_one_to_one(inspection_id: str, body: GenerateEIROneToOneBody):
    """
    Generate one EIR narrative section per 483 observation (strict 1:1).

    Pass approved Form FDA 483 rows as `observations`. When persistence is wired,
    `fetch_approved_483_observations` in `eir_pipeline` can be used to load them by `inspection_id`.
    """
    try:
        drafts = body.observations
        observations = _drafts_to_observations(drafts)
        result = generate_eir_from_483(observations, use_safe_generate=True, retries=2)

        sections = [
            EIROneToOneSection(observation_id=str(s["observation_id"]), eir_text=str(s.get("eir_text", "")))
            for s in result["sections"]
        ]

        return GenerateEIROneToOneResponse(
            status="success",
            inspection_id=inspection_id,
            total_observations=result["total_observations"],
            sections=sections,
            validation_ok=result["validation_ok"],
            validation_message=result["validation_message"],
            tp_score=result["tp_score"],
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
