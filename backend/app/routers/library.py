from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json

from app.deps import get_db
from app.models.database import SavedDocument

router = APIRouter()


@router.get("")
async def list_documents(db: Session = Depends(get_db)):
    docs = db.query(SavedDocument).order_by(SavedDocument.created_at.desc()).all()
    return [
        {
            "id": d.id,
            "firm_name": d.firm_name,
            "fei_number": d.fei_number,
            "inspection_start": d.inspection_start,
            "observation_count": d.observation_count,
            "document_type": d.document_type,
            "status": d.status,
            "created_at": d.created_at.isoformat(),
        }
        for d in docs
    ]


@router.post("")
async def save_document(data: dict, db: Session = Depends(get_db)):
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
        status=data.get("status", "draft"),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {"id": doc.id, "status": "saved"}


@router.get("/{doc_id}")
async def get_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(SavedDocument).filter(SavedDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id": doc.id,
        "firm_name": doc.firm_name,
        "fei_number": doc.fei_number,
        "observation_count": doc.observation_count,
        "observations": json.loads(doc.observations_json or "[]"),
        "metadata": json.loads(doc.metadata_json or "{}"),
        "document_type": doc.document_type,
        "status": doc.status,
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
