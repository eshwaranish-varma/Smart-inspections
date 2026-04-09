"""
ORM models for pipeline audit tables (see data/pipeline_logging_schema.sql).

Imported for side effects so ``Base.metadata.create_all`` can create tables on empty DBs;
production Supabase should apply the SQL migration first.
"""

from __future__ import annotations

import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.models.database import Base


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id = Column(Text, nullable=True)
    run_type = Column(Text, nullable=False)
    status = Column(Text, nullable=False, default="running")
    request_payload = Column(JSONB, nullable=False, default=dict)
    response_summary = Column(JSONB, nullable=False, default=dict)
    metadata_ = Column("metadata", JSONB, nullable=False, default=dict)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    completed_at = Column(DateTime(timezone=True), nullable=True)


class PipelineRunObservation(Base):
    __tablename__ = "pipeline_run_observations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_run_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pipeline_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    observation_index = Column(Integer, nullable=False)
    observation_id = Column(Text, nullable=True)
    payload = Column(JSONB, nullable=False, default=dict)
    evaluation = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))


class PipelineRunChunk(Base):
    __tablename__ = "pipeline_run_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_run_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pipeline_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    observation_index = Column(Integer, nullable=True)
    chunk_type = Column(Text, nullable=True)
    source = Column(Text, nullable=True)
    score = Column(Float, nullable=True)
    content_preview = Column(Text, nullable=True)
    payload = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))


class PipelineRunCfrMatch(Base):
    __tablename__ = "pipeline_run_cfr_matches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_run_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pipeline_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    observation_index = Column(Integer, nullable=False)
    query = Column(Text, nullable=True)
    retrieval_source = Column(Text, nullable=True)
    payload = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))


class PipelineRunEvent(Base):
    __tablename__ = "pipeline_run_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_run_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pipeline_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    observation_index = Column(Integer, nullable=True)
    event_type = Column(Text, nullable=False)
    payload = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
