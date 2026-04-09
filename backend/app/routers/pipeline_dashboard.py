"""Pipeline run storage dashboard (PostgreSQL pipeline_runs + related tables)."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models.pipeline_logging_models import (
    PipelineRun,
    PipelineRunChunk,
    PipelineRunCfrMatch,
    PipelineRunEvent,
    PipelineRunObservation,
)
from app.schemas.pipeline_dashboard import (
    ObservationExplainabilityResponse,
    PipelineDashboardSummary,
    PipelineRunDetailResponse,
    PipelineRunListItem,
    PipelineRunListResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

RUN_TYPE_FILTER = "generate_observations"


def _row_to_dict(model: Any) -> dict[str, Any]:
    d: dict[str, Any] = {}
    for c in model.__table__.columns:
        v = getattr(model, c.key, None)
        if hasattr(v, "hex") and hasattr(v, "bytes"):  # UUID
            d[c.key] = str(v)
        elif isinstance(v, dict):
            d[c.key] = dict(v)
        else:
            d[c.key] = v
    if "metadata_" in d:
        d["metadata"] = d.pop("metadata_")
    return d


def _mean(nums: list[float]) -> float | None:
    if not nums:
        return None
    return round(sum(nums) / len(nums), 4)


@router.get("/pipeline/dashboard/summary", response_model=PipelineDashboardSummary)
def get_pipeline_dashboard_summary(db: Session = Depends(get_db)):
    """Aggregate metrics across stored pipeline runs (preferring persisted evaluation JSON)."""
    try:
        run_q = select(PipelineRun).where(
            PipelineRun.status == "success",
            PipelineRun.run_type == RUN_TYPE_FILTER,
        )
        runs = list(db.execute(run_q).scalars().all())
        total_runs = len(runs)

        obs_count_q = (
            select(func.count())
            .select_from(PipelineRunObservation)
            .join(PipelineRun, PipelineRunObservation.pipeline_run_id == PipelineRun.id)
            .where(PipelineRun.run_type == RUN_TYPE_FILTER)
        )
        total_observations = int(db.scalar(obs_count_q) or 0)

        ev_q = (
            select(PipelineRunObservation.evaluation)
            .join(PipelineRun, PipelineRunObservation.pipeline_run_id == PipelineRun.id)
            .where(PipelineRun.run_type == RUN_TYPE_FILTER)
        )
        eval_rows = [r for r in db.execute(ev_q).scalars().all() if isinstance(r, dict)]

        confs: list[float] = []
        gfs: list[float] = []
        cfrs: list[float] = []
        rets: list[float] = []
        for ev in eval_rows:
            c = ev.get("confidence")
            if c is not None:
                try:
                    confs.append(float(c))
                except (TypeError, ValueError):
                    pass
            g = ev.get("grounding_f1")
            if g is not None:
                try:
                    gfs.append(float(g))
                except (TypeError, ValueError):
                    pass
            bd = ev.get("confidence_breakdown")
            if isinstance(bd, dict):
                try:
                    if bd.get("cfr_score") is not None:
                        cfrs.append(float(bd["cfr_score"]))
                except (TypeError, ValueError):
                    pass
                try:
                    if bd.get("retrieval_score") is not None:
                        rets.append(float(bd["retrieval_score"]))
                except (TypeError, ValueError):
                    pass

        fallback_rs = [r.response_summary or {} for r in runs if r.response_summary]
        avg_conf = _mean(confs)
        if avg_conf is None and fallback_rs:
            vals = []
            for x in fallback_rs:
                v = x.get("avg_confidence")
                if v is not None:
                    try:
                        vals.append(float(v))
                    except (TypeError, ValueError):
                        pass
            avg_conf = _mean(vals)

        return PipelineDashboardSummary(
            total_runs=total_runs,
            total_observations=total_observations,
            avg_confidence=avg_conf,
            avg_grounding_f1=_mean(gfs),
            avg_cfr_score=_mean(cfrs) if cfrs else None,
            avg_retrieval_score=_mean(rets) if rets else None,
        )
    except Exception as e:
        logger.exception("pipeline dashboard summary failed")
        raise HTTPException(status_code=503, detail=f"Dashboard unavailable: {e}") from e


@router.get("/pipeline/runs", response_model=PipelineRunListResponse)
def list_pipeline_runs(
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    run_type: str | None = Query(None, description="Filter by run_type; default all types"),
):
    total_q = select(func.count()).select_from(PipelineRun)
    if run_type:
        total_q = total_q.where(PipelineRun.run_type == run_type)
    total = int(db.scalar(total_q) or 0)

    q = select(PipelineRun).order_by(desc(PipelineRun.created_at))
    if run_type:
        q = q.where(PipelineRun.run_type == run_type)
    q = q.offset(offset).limit(limit)
    rows = list(db.execute(q).scalars().all())

    items: list[PipelineRunListItem] = []
    for r in rows:
        rs = r.response_summary or {}
        items.append(
            PipelineRunListItem(
                id=r.id,
                run_type=r.run_type,
                inspection_id=r.inspection_id,
                status=r.status,
                created_at=r.created_at,
                completed_at=r.completed_at,
                observation_count=rs.get("observation_count"),
                avg_confidence=_maybe_float(rs.get("avg_confidence")),
                doc_id=rs.get("doc_id"),
            )
        )
    return PipelineRunListResponse(total=total, limit=limit, offset=offset, items=items)


def _maybe_float(x: Any) -> float | None:
    if x is None:
        return None
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


@router.get("/pipeline/runs/{run_id}", response_model=PipelineRunDetailResponse)
def get_pipeline_run_detail(run_id: UUID, db: Session = Depends(get_db)):
    run = db.execute(select(PipelineRun).where(PipelineRun.id == run_id)).scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Pipeline run not found")

    obs = list(
        db.execute(
            select(PipelineRunObservation)
            .where(PipelineRunObservation.pipeline_run_id == run_id)
            .order_by(PipelineRunObservation.observation_index)
        ).scalars().all()
    )
    chunks = list(
        db.execute(
            select(PipelineRunChunk).where(PipelineRunChunk.pipeline_run_id == run_id).order_by(PipelineRunChunk.created_at)
        ).scalars().all()
    )
    cfr = list(
        db.execute(
            select(PipelineRunCfrMatch).where(PipelineRunCfrMatch.pipeline_run_id == run_id).order_by(
                PipelineRunCfrMatch.observation_index, PipelineRunCfrMatch.created_at
            )
        ).scalars().all()
    )
    evs = list(
        db.execute(
            select(PipelineRunEvent).where(PipelineRunEvent.pipeline_run_id == run_id).order_by(PipelineRunEvent.created_at)
        ).scalars().all()
    )

    return PipelineRunDetailResponse(
        run=_row_to_dict(run),
        observations=[_row_to_dict(o) for o in obs],
        chunks=[_row_to_dict(c) for c in chunks],
        cfr_matches=[_row_to_dict(x) for x in cfr],
        events=[_row_to_dict(e) for e in evs],
    )


@router.get(
    "/pipeline/runs/{run_id}/observations/{observation_index}",
    response_model=ObservationExplainabilityResponse,
)
def get_observation_explainability(
    run_id: UUID,
    observation_index: int,
    db: Session = Depends(get_db),
):
    run = db.execute(select(PipelineRun).where(PipelineRun.id == run_id)).scalar_one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Pipeline run not found")

    obs = db.execute(
        select(PipelineRunObservation).where(
            PipelineRunObservation.pipeline_run_id == run_id,
            PipelineRunObservation.observation_index == observation_index,
        )
    ).scalar_one_or_none()
    if obs is None:
        raise HTTPException(status_code=404, detail="Observation not found for this run")

    payload = obs.payload if isinstance(obs.payload, dict) else {}
    ev = obs.evaluation if isinstance(obs.evaluation, dict) else {}

    chunks = list(
        db.execute(
            select(PipelineRunChunk).where(
                PipelineRunChunk.pipeline_run_id == run_id,
                PipelineRunChunk.observation_index == observation_index,
            ).order_by(PipelineRunChunk.created_at)
        ).scalars().all()
    )
    chunk_out = [_row_to_dict(c) for c in chunks]

    cfr_rows = list(
        db.execute(
            select(PipelineRunCfrMatch).where(
                PipelineRunCfrMatch.pipeline_run_id == run_id,
                PipelineRunCfrMatch.observation_index == observation_index,
            ).order_by(PipelineRunCfrMatch.created_at)
        ).scalars().all()
    )
    cfr_candidates = [m.payload if isinstance(m.payload, dict) else {} for m in cfr_rows]

    meta = run.metadata_ if isinstance(run.metadata_, dict) else {}
    grounding_mode = meta.get("grounding_mode")

    bd = ev.get("confidence_breakdown")
    if not isinstance(bd, dict):
        bd = payload.get("confidence_breakdown") if isinstance(payload.get("confidence_breakdown"), dict) else None

    return ObservationExplainabilityResponse(
        pipeline_run_id=run_id,
        observation_index=observation_index,
        observation_text=str(payload.get("observation_text") or ""),
        evidence_used=list(payload.get("evidence_list") or []),
        matched_cfr=str(payload.get("matched_citation") or payload.get("cfr_citation") or "") or None,
        cfr_score=_maybe_float(payload.get("citation_match_score")),
        cfr_candidates=cfr_candidates,
        retrieved_chunks=chunk_out,
        grounding_mode=grounding_mode,
        grounding={
            "grounded": ev.get("grounded"),
            "grounding_f1": ev.get("grounding_f1"),
            "narrative_grounding_ratio": ev.get("narrative_grounding_ratio"),
        },
        confidence=_maybe_float(ev.get("confidence")) or _maybe_float(payload.get("confidence")),
        confidence_breakdown=bd if isinstance(bd, dict) else None,
        payload=payload,
        evaluation=ev,
    )
