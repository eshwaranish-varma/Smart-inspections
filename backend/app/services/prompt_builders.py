"""
Centralized FDA 483 / EIR prompt fragments.

**Phase 1** — Form FDA 483 drafting from inspection notes.  
**Phase 2** — Traceable EIR narrative from approved 483 + notes + regulatory context.
"""

from __future__ import annotations

def evidence_mode_instructions(evidence_mode: str, *, strict_retrieved: bool) -> str:
    """Extra rules aligned with evaluation (substring vs semantic grounding)."""
    em = (evidence_mode or "balanced").strip().lower()
    if em == "strict":
        base = (
            "EVIDENCE MODE: STRICT — Use ONLY the provided evidence snippets below (and RAW INSPECTION NOTES). "
            "Copy evidence phrases exactly as written unless minor punctuation/spacing normalization is required. "
            "Do not invent or paraphrase evidence beyond minor formatting cleanup."
        )
    else:
        base = (
            "EVIDENCE MODE: BALANCED — Prefer verbatim phrases from RAW INSPECTION NOTES and the retrieved excerpts; "
            "minor rewording is allowed only when meaning is unchanged and grounding remains verifiable."
        )
    if strict_retrieved:
        base += (
            "\nUse evidence phrases exactly as written in the RETRIEVED NOTE EXCERPTS when listing evidence_used, "
            "unless normalization is necessary for OCR noise."
        )
    return base


def build_observation_prompt(
    *,
    base_user_prompt: str,
    retrieved_context: str,
    evidence_mode: str,
    use_retrieved_evidence_only: bool,
) -> str:
    """
    Wraps the per-observation draft user message with retrieval + evidence-alignment blocks.
    ``base_user_prompt`` is typically from ``build_draft_483_prompt``.
    """
    extra = evidence_mode_instructions(evidence_mode, strict_retrieved=use_retrieved_evidence_only)
    if not (retrieved_context or "").strip():
        return f"{extra}\n\n{base_user_prompt}"

    block = (
        "RETRIEVED NOTE / REGULATORY EXCERPTS (highest relevance to this observation — use for grounding):\n"
        f"{retrieved_context}\n\n"
        "Use ONLY the provided evidence snippets and RAW INSPECTION NOTES for evidence_used. "
        "Do not invent or paraphrase evidence beyond what the selected mode allows.\n\n"
    )
    return f"{extra}\n\n{block}{base_user_prompt}"


def build_eir_user_message_body(
    *,
    obs_text: str,
    raw_notes_block: str,
    kb_context_block: str,
    metadata_lines: str,
) -> str:
    """Shared structure for EIR narrative user messages (Phase 2)."""
    return f"""{metadata_lines}

DRAFT FORM FDA 483 OBSERVATIONS (authoritative list — narrative must align):
{obs_text}

RAW INSPECTION NOTES / SUPPORTING TEXT (retrieved excerpts + controlled truncation):
{raw_notes_block}

SUPPLEMENTAL REGULATORY CONTEXT (IOM / reference PDF excerpts):
{kb_context_block}
"""


__all__ = [
    "evidence_mode_instructions",
    "build_observation_prompt",
    "build_eir_user_message_body",
]
