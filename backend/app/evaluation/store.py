from __future__ import annotations

import json
import os
import threading
from pathlib import Path
from typing import Any

_LOCK = threading.Lock()

_STORE_DIR = Path(__file__).resolve().parent
_LOG_FILE = _STORE_DIR / "evaluation_logs.json"

if os.getenv("ENVIRONMENT", "development").strip().lower() in ("production", "prod"):
    _tmp_dir = Path("/tmp/smart_inspections")
    _tmp_dir.mkdir(parents=True, exist_ok=True)
    _LOG_FILE = _tmp_dir / "evaluation_logs.json"


def _ensure_file() -> None:
    if not _LOG_FILE.exists():
        _LOG_FILE.write_text("[]", encoding="utf-8")


def load_evaluations() -> list[dict[str, Any]]:
    _ensure_file()
    try:
        raw = _LOG_FILE.read_text(encoding="utf-8")
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def _write_all(records: list[dict[str, Any]]) -> None:
    _LOG_FILE.write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8")


def save_evaluation(record: dict[str, Any]) -> None:
    with _LOCK:
        _ensure_file()
        records = load_evaluations()
        records.append(record)
        _write_all(records)


def get_evaluation_by_id(doc_id: str) -> dict[str, Any] | None:
    for rec in load_evaluations():
        if rec.get("doc_id") == doc_id:
            return rec
    return None


def list_evaluations_for_inspection(inspection_id: str) -> list[dict[str, Any]]:
    """All evaluation records for a workflow inspection (oldest first)."""
    iid = (inspection_id or "").strip()
    if not iid:
        return []
    return [r for r in load_evaluations() if (r.get("inspection_id") or "").strip() == iid]


def list_evaluation_summaries(
    *,
    title_query: str | None = None,
    inspection_id: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Return newest-first summaries for dashboard search (by title or inspection id)."""
    records = load_evaluations()
    rows: list[dict[str, Any]] = []
    tq = (title_query or "").strip().lower()
    iid = (inspection_id or "").strip()

    for rec in reversed(records):
        rid = (rec.get("inspection_id") or "").strip()
        rtitle = (rec.get("inspection_title") or "").strip()
        if iid and rid != iid:
            continue
        if tq and tq not in rtitle.lower():
            continue
        scores = rec.get("scores") or {}
        try:
            overall = float(scores.get("overall", 0.0))
        except (TypeError, ValueError):
            overall = 0.0
        rows.append(
            {
                "doc_id": rec.get("doc_id"),
                "inspection_title": rtitle or None,
                "inspection_id": rid or None,
                "created_at": rec.get("created_at"),
                "overall": round(overall, 4),
            }
        )
        if len(rows) >= limit:
            break

    return rows
