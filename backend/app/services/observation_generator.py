from __future__ import annotations

from app.services.llm_client import call_llm

PROMPT = """Generate one FDA Form 483 style observation narrative.

Use ONLY the evidence lines below for factual content. Do not invent dates, lots, record IDs, or findings not stated in the evidence.

Evidence:
{evidence}

Rules:
- Professional FDA observation tone; lead with deficiency, then support with facts from evidence only.
- Do not add bullet points that are not supported by the evidence text.
- Include a plausible 21 CFR citation line at the end of your paragraph if one clearly applies; otherwise state the deficiency without fabricating a CFR.
- Return plain text only (no JSON, no markdown fences)."""


def generate_observation(evidence_list: list[str]) -> str:
    if not evidence_list:
        return ""
    evidence_text = "\n".join([f"- {e}" for e in evidence_list])
    return call_llm(PROMPT.format(evidence=evidence_text))
