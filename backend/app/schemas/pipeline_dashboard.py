"""Response models for pipeline evaluation dashboard APIs."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class PipelineDashboardSummary(BaseModel):
    total_runs: int = 0
    total_observations: int = 0
    avg_confidence: float | None = None
    avg_grounding_f1: float | None = None
    avg_cfr_score: float | None = None
    avg_retrieval_score: float | None = None


class PipelineRunListItem(BaseModel):
    id: UUID
    run_type: str
    inspection_id: str | None = None
    status: str
    created_at: datetime | None = None
    completed_at: datetime | None = None
    observation_count: int | None = None
    avg_confidence: float | None = None
    doc_id: str | None = None


class PipelineRunListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[PipelineRunListItem]


class PipelineRunDetailResponse(BaseModel):
    run: dict[str, Any]
    observations: list[dict[str, Any]]
    chunks: list[dict[str, Any]]
    cfr_matches: list[dict[str, Any]]
    events: list[dict[str, Any]]


class ObservationExplainabilityResponse(BaseModel):
    pipeline_run_id: UUID
    observation_index: int
    observation_text: str = ""
    evidence_used: list[str] = Field(default_factory=list)
    matched_cfr: str | None = None
    cfr_score: float | None = None
    cfr_candidates: list[dict[str, Any]] = Field(default_factory=list)
    retrieved_chunks: list[dict[str, Any]] = Field(default_factory=list)
    grounding_mode: str | None = None
    grounding: dict[str, Any] = Field(default_factory=dict)
    confidence: float | None = None
    confidence_breakdown: dict[str, Any] | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    evaluation: dict[str, Any] = Field(default_factory=dict)
