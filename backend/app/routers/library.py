from __future__ import annotations

import json
import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models.database import SavedDocument

router = APIRouter()

# Rows that still represent in-flight drafting (shown in Document Library "active drafts").
ACTIVE_SAVED_DOCUMENT_STATUSES = ("draft", "in_progress", "under_review")


def _normalize_fei_digits(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\D", "", value)


def _saved_document_status_display(raw: str | None) -> tuple[str, str]:
    """Return (canonical_status, human label for API consumers)."""
    s = (raw or "draft").strip().lower()
    if s in ("draft", "in_progress"):
        return s, "IN PROGRESS"
    if s == "under_review":
        return s, "PENDING REVIEW"
    if s in ("approved", "completed", "published"):
        return s, "COMPLETED"
    if s == "archived":
        return s, "ARCHIVED"
    return s, s.replace("_", " ").upper()


def _serialize_saved_document(d: SavedDocument) -> dict:
    _, display = _saved_document_status_display(d.status)
    return {
        "id": d.id,
        "firm_name": d.firm_name,
        "fei_number": d.fei_number,
        "inspection_start": d.inspection_start,
        "observation_count": d.observation_count,
        "document_type": d.document_type,
        "status": d.status,
        "status_display": display,
        "inspection_id": d.inspection_id,
        "created_at": d.created_at.isoformat(),
    }


def _latest_active_per_firm_fei(db: Session) -> list[SavedDocument]:
    firm_co = func.coalesce(SavedDocument.firm_name, "")
    fei_co = func.coalesce(SavedDocument.fei_number, "")
    subq = (
        db.query(
            firm_co.label("fn"),
            fei_co.label("fe"),
            func.max(SavedDocument.id).label("max_id"),
        )
        .filter(SavedDocument.status.in_(ACTIVE_SAVED_DOCUMENT_STATUSES))
        .group_by(firm_co, fei_co)
        .subquery()
    )
    return (
        db.query(SavedDocument)
        .join(
            subq,
            and_(
                func.coalesce(SavedDocument.firm_name, "") == subq.c.fn,
                func.coalesce(SavedDocument.fei_number, "") == subq.c.fe,
                SavedDocument.id == subq.c.max_id,
            ),
        )
        .order_by(SavedDocument.created_at.desc())
        .all()
    )


@router.get("")
async def list_documents(db: Session = Depends(get_db)):
    docs = _latest_active_per_firm_fei(db)
    return [_serialize_saved_document(d) for d in docs]


@router.post("")
async def save_document(data: dict, db: Session = Depends(get_db)):
    raw_status = (data.get("status") or "draft").strip().lower()
    if raw_status not in ACTIVE_SAVED_DOCUMENT_STATUSES:
        raw_status = "draft"
    inspection_id = data.get("inspection_id")
    if inspection_id is not None:
        inspection_id = str(inspection_id).strip() or None
    doc = SavedDocument(
        firm_name=data.get("firm_name", ""),
        fei_number=data.get("fei_number", ""),
        establishment_type=data.get("establishment_type", ""),
        inspection_start=data.get("inspection_start", ""),
        inspection_end=data.get("inspection_end", ""),
        district_office=data.get("district_office", ""),
        observation_count=data.get("observation_count", 0),
        observations_json=json.dumps(data.get("observations", [])),
        metadata_json=json.dumps(data.get("metadata", {})),
        document_type=data.get("document_type", "483"),
        status=raw_status,
        inspection_id=inspection_id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {"id": doc.id, "status": "saved"}


@router.post("/complete-inspection")
async def complete_inspection(data: dict, db: Session = Depends(get_db)):
    """
    Mark saved_document rows as approved when a workflow inspection is archived to the
    document library (or closed). Idempotent for already-approved rows (skipped by filter).
    """
    inspection_id = data.get("inspection_id")
    fei_number = data.get("fei_number")
    if inspection_id is not None:
        inspection_id = str(inspection_id).strip() or None
    if fei_number is not None:
        fei_number = str(fei_number).strip() or None

    if not inspection_id and not fei_number:
        raise HTTPException(status_code=400, detail="inspection_id or fei_number is required")

    clauses: list = []
    if inspection_id:
        clauses.append(SavedDocument.inspection_id == inspection_id)
    if fei_number:
        fei_variants = {fei_number}
        fd = _normalize_fei_digits(fei_number)
        if fd:
            fei_variants.add(fd)
        for fv in fei_variants:
            if not fv:
                continue
            clauses.append(
                and_(SavedDocument.inspection_id.is_(None), SavedDocument.fei_number == fv)
            )

    q = db.query(SavedDocument).filter(
        SavedDocument.status.in_(ACTIVE_SAVED_DOCUMENT_STATUSES),
        or_(*clauses),
    )
    rows = q.all()
    now = datetime.utcnow()
    for doc in rows:
        doc.status = "approved"
        doc.updated_at = now
    db.commit()
    return {"updated": len(rows)}


@router.get("/{doc_id}")
async def get_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(SavedDocument).filter(SavedDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    _, display = _saved_document_status_display(doc.status)
    return {
        "id": doc.id,
        "firm_name": doc.firm_name,
        "fei_number": doc.fei_number,
        "observation_count": doc.observation_count,
        "observations": json.loads(doc.observations_json or "[]"),
        "metadata": json.loads(doc.metadata_json or "{}"),
        "document_type": doc.document_type,
        "status": doc.status,
        "status_display": display,
        "inspection_id": doc.inspection_id,
        "created_at": doc.created_at.isoformat(),
    }


@router.delete("/{doc_id}")
async def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(SavedDocument).filter(SavedDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(doc)
    db.commit()
    return {"status": "deleted"}
