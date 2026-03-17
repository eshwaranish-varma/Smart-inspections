from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.config import settings
from app.models.database import get_engine, get_session_factory, init_db
from app.deps import set_kb_service, set_db_session_factory, get_kb
from app.services.knowledge_base import KnowledgeBaseService

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Smart Inspections backend...")

    engine = get_engine(settings.database_url)
    init_db(engine)
    set_db_session_factory(get_session_factory(engine))
    logger.info("Database initialized")

    try:
        kb = KnowledgeBaseService(data_dir=settings.data_path)
        kb.initialize()
        set_kb_service(kb)
        logger.info("Knowledge base loaded")
    except Exception as e:
        logger.warning("Knowledge base init failed (non-fatal): %s", e)
        set_kb_service(KnowledgeBaseService(data_dir=settings.data_path))

    yield

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

from app.routers import observations, ai, documents, ocr, library, citations, references  # noqa: E402

app.include_router(observations.router, prefix="/api/observations", tags=["Observations"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
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
