"""
SQLAlchemy engine and models for the FastAPI backend.

Production uses PostgreSQL (e.g. Supabase). Resolve the connection string via
``Settings.effective_database_url`` (direct vs pooler by environment).

SSL: append ``?sslmode=require`` when missing on remote hosts; skipped for localhost / Docker ``db``.

Data migration (local → Supabase):
  Option A: pg_dump -Fc -h localhost -U <user> <dbname> -f backup.dump
           pg_restore -h <supabase-host> -U postgres -d postgres --no-owner backup.dump
  Option B: pg_dump -h localhost ... --data-only --inserts > data.sql
           psql "<supabase-url>" -f data.sql
"""
from __future__ import annotations

import logging
import socket
import time
from datetime import datetime
from urllib.parse import urlparse, urlunparse

from sqlalchemy import Column, DateTime, Integer, String, Text, create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import DBAPIError, OperationalError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

Base = declarative_base()

_engine: Engine | None = None


class SavedDocument(Base):
    __tablename__ = "saved_documents"
    id = Column(Integer, primary_key=True, autoincrement=True)
    firm_name = Column(String(255))
    fei_number = Column(String(20))
    establishment_type = Column(String(100))
    inspection_start = Column(String(20))
    inspection_end = Column(String(20))
    district_office = Column(String(255))
    observation_count = Column(Integer, default=0)
    observations_json = Column(Text)
    metadata_json = Column(Text)
    document_type = Column(String(20), default="483")
    status = Column(String(20), default="draft")
    """Links draft rows to Postgres workflow inspection UUID when saved from New Inspection / workflow."""
    inspection_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(100))
    details = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)


def _ensure_postgresql_url(database_url: str) -> str:
    u = database_url.strip()
    if not u.startswith(("postgresql://", "postgres://")):
        raise ValueError(
            "DATABASE_URL must be a PostgreSQL connection string (postgresql:// or postgres://). "
            "SQLite and other drivers are not supported."
        )
    return u


def _is_local_postgres_url(url: str) -> bool:
    u = url.lower()
    return (
        "localhost" in u
        or "127.0.0.1" in u
        or "@db:" in u
        or ".internal" in u
    )


def _ensure_sslmode_require(url: str) -> str:
    """Append sslmode=require if not present (Supabase / cloud Postgres). Skip for local dev."""
    if _is_local_postgres_url(url):
        return url
    if "sslmode=" in url.lower():
        return url
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}sslmode=require"


def mask_database_url(url: str) -> str:
    """Mask password in a PostgreSQL URI for logs."""
    try:
        p = urlparse(url)
        netloc = p.netloc
        if "@" in netloc:
            userinfo, host_part = netloc.rsplit("@", 1)
            if ":" in userinfo:
                user, _pwd = userinfo.split(":", 1)
                netloc = f"{user}:****@{host_part}"
            else:
                netloc = f"****@{host_part}"
        return urlunparse((p.scheme, netloc, p.path, p.params, p.query, p.fragment))
    except Exception:
        return "<could not parse database URL>"


def _format_db_error(exc: BaseException | None) -> str:
    if exc is None:
        return "unknown error"
    parts: list[str] = [f"{type(exc).__name__}: {exc}"]
    c = getattr(exc, "__cause__", None)
    if c is not None:
        parts.append(f"cause={type(c).__name__}: {c}")
    return " | ".join(parts)


def _collect_exception_text(exc: BaseException | None) -> str:
    parts: list[str] = []
    c: BaseException | None = exc
    while c is not None:
        parts.append(str(c).lower())
        c = getattr(c, "__cause__", None)
    return " ".join(parts)


def _log_connection_failure_hints(database_url: str, exc: BaseException | None) -> None:
    """Extra log lines for common Supabase misconfiguration (DNS / wrong host)."""
    if exc is None:
        return
    blob = _collect_exception_text(exc)
    dns_like = any(
        p in blob
        for p in (
            "could not translate host name",
            "name or service not known",
            "gaierror",
            "nodename nor servname",
            "name resolution",
        )
    )
    if not dns_like:
        return
    try:
        host = urlparse(database_url).hostname or "?"
    except Exception:
        host = "?"
    logger.error(
        "DNS failed for host %r — this PC cannot resolve the hostname (not a wrong password). "
        "Try: (1) `nslookup %s` in PowerShell — if it fails, fix network/DNS (VPN off, try other DNS, "
        "flush: `ipconfig /flushdns`). "
        "(2) In Supabase → Database, try the Session or Transaction pooler URI instead "
        "(host looks like aws-0-REGION.pooler.supabase.com — sometimes resolves when db.* does not). "
        "(3) Confirm the project is active and the ref matches the dashboard.",
        host,
        host,
    )


def _is_retriable_db_error(exc: BaseException) -> bool:
    """Transient network / pool issues — not auth or SQL syntax problems."""
    if isinstance(exc, (socket.gaierror, socket.timeout, TimeoutError, OSError)):
        return True
    if isinstance(exc, (OperationalError, DBAPIError)):
        pass
    else:
        c = getattr(exc, "__cause__", None)
        if c is not None and _is_retriable_db_error(c):
            return True

    msg = str(exc).lower()
    if "password authentication failed" in msg or "28p01" in msg:
        return False
    if "invalid_authorization" in msg:
        return False

    needles = (
        "connection refused",
        "could not translate host name",
        "name or service not known",
        "temporary failure in name resolution",
        "timeout",
        "connection terminated",
        "lost connection",
        "could not connect",
        "server closed the connection",
        "ssl connection has been closed",
        "eof detected",
        "operationalerror",
    )
    if any(n in msg for n in needles):
        return True

    if isinstance(exc, (OperationalError, DBAPIError)):
        return True

    c = getattr(exc, "__cause__", None)
    if c is not None:
        return _is_retriable_db_error(c)
    return False


def create_engine_with_retry(
    database_url: str,
    *,
    max_attempts: int = 3,
    base_delay_s: float = 0.5,
) -> Engine:
    """
    Build a pooled SQLAlchemy engine and verify connectivity with ``SELECT 1``.

    Retries with exponential backoff on transient DNS / network / pool errors.
    """
    url = _ensure_sslmode_require(_ensure_postgresql_url(database_url))
    masked = mask_database_url(url)
    logger.info("Database engine: connecting to %s", masked)

    last_error: BaseException | None = None
    for attempt in range(1, max_attempts + 1):
        engine: Engine | None = None
        try:
            engine = create_engine(
                url,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10,
                pool_timeout=30,
            )
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info(
                "Database connection verified (SELECT 1) on attempt %s/%s",
                attempt,
                max_attempts,
            )
            return engine
        except BaseException as e:
            last_error = e
            if engine is not None:
                try:
                    engine.dispose()
                except Exception:
                    logger.exception("Error disposing engine after failed connect")

            retriable = _is_retriable_db_error(e)
            if attempt < max_attempts and retriable:
                delay = base_delay_s * (2 ** (attempt - 1))
                logger.warning(
                    "Database connection failed (%s/%s): %s — retry in %.1fs",
                    attempt,
                    max_attempts,
                    _format_db_error(e),
                    delay,
                )
                time.sleep(delay)
            else:
                if not retriable and attempt < max_attempts:
                    logger.warning("Non-retriable database error, not retrying: %s", _format_db_error(e))
                break

    logger.error(
        "Database connection failed: check Supabase host or env config. Last error: %s",
        _format_db_error(last_error),
    )
    _log_connection_failure_hints(url, last_error)
    if last_error is not None:
        raise last_error
    raise RuntimeError("Database engine creation failed without exception")


def get_engine(database_url: str) -> Engine:
    """Create engine with pooling, SSL policy, connectivity check, and retries."""
    return create_engine_with_retry(database_url)


def register_engine(engine: Engine | None) -> None:
    """Pass ``None`` when the database is unavailable (e.g. DNS failure at startup)."""
    global _engine
    _engine = engine


def get_engine_instance() -> Engine | None:
    return _engine


def dispose_engine() -> None:
    global _engine
    if _engine is not None:
        try:
            _engine.dispose()
        except Exception:
            logger.exception("Error disposing SQLAlchemy engine")
        _engine = None


def get_session_factory(engine: Engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db(engine: Engine) -> None:
    # Register pipeline logging models on Base.metadata (tables may already exist on Supabase).
    import app.models.pipeline_logging_models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    # Additive migration: existing DBs created before inspection_id on saved_documents.
    try:
        with engine.begin() as conn:
            conn.execute(
                text(
                    "ALTER TABLE saved_documents ADD COLUMN IF NOT EXISTS inspection_id VARCHAR(100)"
                )
            )
    except Exception:
        logger.warning(
            "Could not ensure saved_documents.inspection_id column (non-fatal for KB-only mode)",
            exc_info=True,
        )
