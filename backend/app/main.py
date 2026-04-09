from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from sqlalchemy import text

from app.config import settings
from app.models.database import (
    dispose_engine,
    get_engine,
    get_engine_instance,
    get_session_factory,
    init_db,
    mask_database_url,
    register_engine,
)
from app.deps import set_kb_service, set_db_session_factory, get_kb
from app.services.knowledge_base import KnowledgeBaseService

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Smart Inspections backend...")
    logger.info(
        "Environment=%s | DB target (masked)=%s",
        settings.environment,
        mask_database_url(settings.effective_database_url),
    )

    try:
        engine = get_engine(settings.effective_database_url)
        register_engine(engine)
        init_db(engine)
        set_db_session_factory(get_session_factory(engine))
        logger.info("Database initialized and ORM metadata synced")
    except Exception as e:
        logger.warning(
            "Database unavailable at startup (API will run; DB routes return errors until fixed): %s",
            e,
            exc_info=logger.isEnabledFor(logging.DEBUG),
        )
        register_engine(None)
        set_db_session_factory(None)

    try:
        kb = KnowledgeBaseService(data_dir=settings.data_path)
        kb.initialize()
        set_kb_service(kb)
        logger.info("Knowledge base loaded")
    except Exception as e:
        logger.warning("Knowledge base init failed (non-fatal): %s", e)
        set_kb_service(KnowledgeBaseService(data_dir=settings.data_path))

    yield

    dispose_engine()
    logger.info("Shutting down...")


app = FastAPI(
    title="Smart Inspections API",
    description="AI-Assisted FDA 483 & EIR Drafting Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import observations, ai, documents, ocr, library, citations, references, eval as eval_router  # noqa: E402
from app.routers import pipeline_dashboard  # noqa: E402
from app.routers import evaluation_dashboard  # noqa: E402
from app.routers import eir_pipeline  # noqa: E402

app.include_router(observations.router, prefix="/api/observations", tags=["Observations"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(eval_router.router, prefix="/api/eval", tags=["Evaluation"])
app.include_router(pipeline_dashboard.router, prefix="/api/evaluation", tags=["Pipeline evaluation"])
app.include_router(evaluation_dashboard.router, prefix="/api/evaluation", tags=["Evaluation Dashboard"])
app.include_router(eir_pipeline.router, prefix="/api/eir-pipeline", tags=["EIR 1:1 Pipeline"])
app.include_router(ocr.router, prefix="/api/ocr", tags=["OCR"])
app.include_router(library.router, prefix="/api/library", tags=["Library"])
app.include_router(citations.router, prefix="/api/citations", tags=["Citations"])
app.include_router(references.router, prefix="/api/references", tags=["References"])


@app.get("/")
async def root():
    return {"message": "Smart Inspections API", "version": "1.0.0", "status": "running"}


@app.get("/api/health")
async def health():
    kb = get_kb()
    return {"status": "healthy", "kb_loaded": kb is not None and kb.is_initialized}


@app.get("/health/db")
async def health_db():
    """Verify PostgreSQL connectivity (e.g. Supabase)."""
    engine = get_engine_instance()
    if engine is None:
        logger.error("Database health check failed: engine not registered")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "engine_not_initialized"},
        )
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.exception("Database health check failed")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "database": "connection_failed",
                "detail": str(e),
            },
        )
