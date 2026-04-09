"""
Persist end-to-end AI pipeline logs to PostgreSQL (Supabase).

Call these functions with a SQLAlchemy ``Session`` from ``Depends(get_db)`` (or any session
bound to the app engine). Each function **commits** the transaction so rows survive ``get_db``'s
session close (which otherwise rolls back uncommitted work).

Tables are defined in ``data/pipeline_logging_schema.sql``; ORM models live in
``app.models.pipeline_logging_models``.
"""

from __future__ import annotations

import logging
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.pipeline_logging_models import (
    PipelineRun,
    PipelineRunChunk,
    PipelineRunCfrMatch,
    PipelineRunEvent,
    PipelineRunObservation,
)

logger = logging.getLogger(__name__)


def _as_uuid(run_id: UUID | str) -> UUID:
    return run_id if isinstance(run_id, UUID) else UUID(str(run_id))


def _jsonb(data: dict[str, Any] | None) -> dict[str, Any]:
    """Ensure a plain dict suitable for JSONB (deep copy to avoid accidental mutation)."""
    if not data:
        return {}
    return deepcopy(data)


def create_pipeline_run(
    session: Session,
    *,
    run_type: str,
    inspection_id: str | None = None,
    request_payload: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
    status: str = "running",
) -> UUID:
    """
    Insert a ``pipeline_runs`` row and return its id.

    Typically called at the start of ``generate_observations``, ``draft_483``, EIR routes, etc.
    """
    row = PipelineRun(
        run_type=run_type,
        inspection_id=inspection_id,
        status=status,
        request_payload=_jsonb(request_payload),
        response_summary={},
        metadata_=_jsonb(metadata),
        error_message=None,
        completed_at=None,
    )
    session.add(row)
    session.flush()
    rid = row.id
    session.commit()
    logger.info("pipeline_run created id=%s type=%s inspection_id=%s", rid, run_type, inspection_id)
    return rid


def log_pipeline_event(
    session: Session,
    pipeline_run_id: UUID | str,
    event_type: str,
    payload: dict[str, Any] | None = None,
    *,
    observation_index: int | None = None,
) -> UUID:
    """Append one row to ``pipeline_run_events`` (timeline / structured log)."""
    row = PipelineRunEvent(
        pipeline_run_id=_as_uuid(pipeline_run_id),
        observation_index=observation_index,
        event_type=event_type,
        payload=_jsonb(payload),
    )
    session.add(row)
    session.flush()
    eid = row.id
    session.commit()
    return eid


def log_observation_result(
    session: Session,
    pipeline_run_id: UUID | str,
    observation_index: int,
    payload: dict[str, Any] | None = None,
    evaluation: dict[str, Any] | None = None,
    *,
    observation_id: str | None = None,
) -> UUID:
    """
    Upsert a row in ``pipeline_run_observations`` for ``(pipeline_run_id, observation_index)``.

    If a row already exists (unique constraint), it is replaced with the new payload/evaluation.
    """
    pid = _as_uuid(pipeline_run_id)
    existing = session.execute(
        select(PipelineRunObservation).where(
            PipelineRunObservation.pipeline_run_id == pid,
            PipelineRunObservation.observation_index == observation_index,
        )
    ).scalar_one_or_none()
    if existing:
        existing.observation_id = observation_id
        existing.payload = _jsonb(payload)
        existing.evaluation = _jsonb(evaluation)
        session.flush()
        oid = existing.id
    else:
        row = PipelineRunObservation(
            pipeline_run_id=pid,
            observation_index=observation_index,
            observation_id=observation_id,
            payload=_jsonb(payload),
            evaluation=_jsonb(evaluation),
        )
        session.add(row)
        session.flush()
        oid = row.id
    session.commit()
    return oid


def log_retrieved_chunks(
    session: Session,
    pipeline_run_id: UUID | str,
    chunks: list[dict[str, Any]],
    *,
    default_observation_index: int | None = None,
) -> list[UUID]:
    """
    Insert one ``pipeline_run_chunks`` row per chunk.

    Each chunk dict may include:
    ``observation_index`` (optional; falls back to ``default_observation_index``),
    ``chunk_type``, ``source``, ``score``, ``content_preview``, ``payload`` (extra JSON merged into payload column).
    """
    pid = _as_uuid(pipeline_run_id)
    ids: list[UUID] = []
    for raw in chunks:
        item = dict(raw)
        obs_idx = item.pop("observation_index", default_observation_index)
        chunk_type = item.pop("chunk_type", None)
        source = item.pop("source", None)
        score = item.pop("score", None)
        content_preview = item.pop("content_preview", None)
        base_payload = item.pop("payload", {})
        merged = _jsonb(base_payload)
        merged.update(item)

        row = PipelineRunChunk(
            pipeline_run_id=pid,
            observation_index=obs_idx,
            chunk_type=chunk_type,
            source=source,
            score=float(score) if score is not None else None,
            content_preview=content_preview,
            payload=merged,
        )
        session.add(row)
        session.flush()
        ids.append(row.id)
    session.commit()
    return ids


def log_cfr_candidates(
    session: Session,
    pipeline_run_id: UUID | str,
    observation_index: int,
    candidates: list[dict[str, Any]],
    *,
    query: str | None = None,
    default_retrieval_source: str | None = None,
) -> list[UUID]:
    """
    Insert CFR / Title 21 match rows for one observation.

    Each candidate in ``candidates`` becomes one ``pipeline_run_cfr_matches`` row.
    Optional per-candidate keys: ``retrieval_source`` (overrides default), merged into ``payload`` for any other keys.
    """
    pid = _as_uuid(pipeline_run_id)
    ids: list[UUID] = []
    for c in candidates:
        item = dict(c)
        rsrc = item.pop("retrieval_source", default_retrieval_source)
        payload = _jsonb(item)

        row = PipelineRunCfrMatch(
            pipeline_run_id=pid,
            observation_index=observation_index,
            query=query,
            retrieval_source=rsrc,
            payload=payload,
        )
        session.add(row)
        session.flush()
        ids.append(row.id)
    session.commit()
    return ids


def finalize_pipeline_run(
    session: Session,
    pipeline_run_id: UUID | str,
    *,
    status: str,
    response_summary: dict[str, Any] | None = None,
    error_message: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """
    Update the ``pipeline_runs`` row: status, optional ``response_summary``, ``error_message``, ``metadata`` merge.

    Sets ``completed_at`` to now (UTC) when status is success/failed/cancelled.
    """
    pid = _as_uuid(pipeline_run_id)
    row = session.execute(select(PipelineRun).where(PipelineRun.id == pid)).scalar_one_or_none()
    if row is None:
        logger.warning("finalize_pipeline_run: no pipeline_run id=%s", pid)
        session.rollback()
        return

    row.status = status
    if response_summary is not None:
        row.response_summary = _jsonb(response_summary)
    if error_message is not None:
        row.error_message = error_message
    if metadata is not None:
        merged = dict(row.metadata_ or {})
        merged.update(_jsonb(metadata))
        row.metadata_ = merged

    if status in ("success", "failed", "cancelled"):
        row.completed_at = datetime.now(timezone.utc)

    session.commit()
    logger.info("pipeline_run finalized id=%s status=%s", pid, status)
