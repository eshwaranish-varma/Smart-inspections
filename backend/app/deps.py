"""Shared dependencies — avoids circular imports between main and routers."""

from __future__ import annotations
from typing import TYPE_CHECKING

from fastapi import HTTPException
from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from app.services.knowledge_base import KnowledgeBaseService

_kb_service: "KnowledgeBaseService | None" = None
_db_session_factory = None


def set_kb_service(kb: "KnowledgeBaseService"):
    global _kb_service
    _kb_service = kb


def set_db_session_factory(factory):
    global _db_session_factory
    _db_session_factory = factory


def get_kb() -> "KnowledgeBaseService | None":
    return _kb_service


def get_db():
    if _db_session_factory is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Database not available. Check DATABASE_URL / DATABASE_DIRECT_URL / "
                "DATABASE_POOLER_URL, Supabase host, and network."
            ),
        )
    db: Session = _db_session_factory()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
