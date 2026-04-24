"""
Regulatory drafting façade — clarifies the two product phases without replacing FastAPI routes.

**Phase 1 — FDA Form 483 drafting:** raw inspection notes → segmentation → one LLM call per
observation; evidence aligned with evaluation (substring / optional semantic grounding).

**Phase 2 — EIR drafting:** approved 483 rows + notes → EIR narrative (standard or traceability pipeline).

Routers in ``app.routers.ai`` and ``app.routers.documents`` remain the public API; this class is
optional for programmatic use (tests, scripts, future consolidation).
"""

from __future__ import annotations

from typing import Any

from app.schemas.inspection import (
    DraftObservation,
    EIRNarrative,
    EIRPipelineNarrative,
    InspectionMetadata,
    ObservationInput,
    ObservationOutput,
)
from app.services.ai_service import AIService


class RegulatoryDraftingService:
    def __init__(self, ai: AIService):
        self._ai = ai

    async def generate_483(self, observations: list[ObservationInput]) -> list[ObservationOutput]:
        """Phase 1: strict per-observation Form FDA 483 draft JSON."""
        return await self._ai.draft_observations(observations)

    def generate_eir(
        self,
        observations: list[DraftObservation],
        inspection_metadata: InspectionMetadata | dict[str, Any],
        raw_notes: str = "",
        kb_context: list[str] | None = None,
    ) -> EIRNarrative:
        """Phase 2 (narrative): Establishment Inspection Report sections from finalized 483 + notes."""
        meta = inspection_metadata.model_dump() if hasattr(inspection_metadata, "model_dump") else dict(inspection_metadata)
        return self._ai.generate_eir_narrative(
            observations=observations,
            inspection_metadata=meta,
            raw_notes=raw_notes,
            kb_context=kb_context or [],
        )

    def generate_eir_pipeline(
        self,
        observations: list[DraftObservation],
        inspection_metadata: InspectionMetadata | dict[str, Any],
        raw_notes: str = "",
        kb_context: list[str] | None = None,
        strict_eir_coverage: bool = False,
    ) -> EIRPipelineNarrative:
        """Phase 2 (traceability): EIR JSON including ``traceability`` array per 483 observation."""
        meta = inspection_metadata.model_dump() if hasattr(inspection_metadata, "model_dump") else dict(inspection_metadata)
        return self._ai.generate_eir_pipeline_narrative(
            observations=observations,
            inspection_metadata=meta,
            raw_notes=raw_notes,
            kb_context=kb_context or [],
            strict_eir_coverage=strict_eir_coverage,
        )
