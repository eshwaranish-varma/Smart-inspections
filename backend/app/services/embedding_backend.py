"""
Shared sentence embeddings: HuggingFace ``all-MiniLM-L6-v2`` by default, with
OpenAI-compatible API fallback when ``sentence-transformers`` is not installed.

Lazy singleton to avoid reloading the model on every request.
"""

from __future__ import annotations

import logging
import threading
from typing import Any

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_embeddings: Any = None
_last_model_name: str | None = None

# OpenAI / OpenRouter-compatible embedding model when HF is unavailable
_FALLBACK_OPENAI_EMBED_MODEL = "text-embedding-3-small"


def _openai_compatible_embeddings():
    from app.config import settings
    from langchain_openai import OpenAIEmbeddings

    if not settings.resolved_openai_api_key:
        return None
    kw: dict[str, Any] = {
        "api_key": settings.resolved_openai_api_key,
        "model": _FALLBACK_OPENAI_EMBED_MODEL,
    }
    bu = settings.resolved_openai_base_url
    if bu:
        kw["base_url"] = bu
    return OpenAIEmbeddings(**kw)


def get_sentence_embedding_model(model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
    """Return a LangChain embeddings instance (thread-safe singleton per ``model_name``)."""
    global _embeddings, _last_model_name
    with _lock:
        if _embeddings is not None and _last_model_name == model_name:
            return _embeddings
        try:
            from langchain_community.embeddings import HuggingFaceEmbeddings
        except ImportError as e:
            alt = _openai_compatible_embeddings()
            if alt is not None:
                logger.warning(
                    "langchain_community HuggingFaceEmbeddings unavailable; using OpenAI-compatible embeddings (%s)",
                    _FALLBACK_OPENAI_EMBED_MODEL,
                )
                _embeddings = alt
                _last_model_name = model_name
                return _embeddings
            raise RuntimeError(
                "Semantic features need either `pip install sentence-transformers` "
                "or OPENAI_API_KEY / OPENAI_ROUTER_API_KEY for embedding fallback."
            ) from e
        try:
            logger.info("Loading embedding model: %s", model_name)
            _embeddings = HuggingFaceEmbeddings(
                model_name=model_name,
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True},
            )
            _last_model_name = model_name
            return _embeddings
        except ImportError:
            alt = _openai_compatible_embeddings()
            if alt is not None:
                logger.warning(
                    "sentence-transformers not available (%s); using OpenAI-compatible embeddings (%s)",
                    model_name,
                    _FALLBACK_OPENAI_EMBED_MODEL,
                )
                _embeddings = alt
                _last_model_name = model_name
                return _embeddings
            raise RuntimeError(
                "Could not load HuggingFace embeddings. Install: pip install sentence-transformers "
                "(or set OPENAI_API_KEY / OPENAI_ROUTER_API_KEY for API embedding fallback)."
            ) from None


def reset_embedding_cache_for_tests():
    """Test helper: clear singleton."""
    global _embeddings, _last_model_name
    with _lock:
        _embeddings = None
        _last_model_name = None
