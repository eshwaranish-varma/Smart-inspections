"""Thin synchronous LLM wrapper for evidence pipeline modules (reuses AIService + app settings)."""

from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from app.config import settings
from app.services.ai_service import AIService


def call_llm(prompt: str, *, system: str | None = None) -> str:
    """
    Invoke the configured provider with a single human prompt (optional system).
    Returns assistant text only.
    """
    svc = AIService(
        provider=settings.llm_provider,
        api_key=settings.resolved_openai_api_key,
        google_api_key=settings.google_api_key,
        model=settings.resolved_openai_model,
        google_model=settings.google_model,
        temperature=settings.openai_temperature,
        openai_base_url=settings.resolved_openai_base_url,
    )
    llm = svc._get_llm()
    messages = []
    if system and system.strip():
        messages.append(SystemMessage(content=system.strip()))
    messages.append(HumanMessage(content=prompt))
    return svc._llm_text(llm.invoke(messages)).strip()
