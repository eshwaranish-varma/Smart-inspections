from __future__ import annotations

import re

from app.services.llm_client import call_llm

SELECTOR_SYSTEM = (
    "You choose evidence by line number. Output ONLY lines like: `N.` then the EXACT sentence from the input for "
    "that N (character-for-character same as listed). No extra prose."
)

PROMPT = """Select EXACT evidence from the numbered list (use for FDA 483 grounding).

STRICT RULES:
- Output one line per pick: `N. ` followed by the EXACT text of sentence N from the list (verbatim).
- Do NOT paraphrase or edit.
- Pick up to {k} lines, most relevant to inspection deficiencies.

Sentences:
{sentences}
"""


def select_evidence(sentences: list[str], k: int = 5) -> list[str]:
    if not sentences:
        return []
    k = max(1, min(k, len(sentences)))
    formatted = "\n".join([f"{i + 1}. {s}" for i, s in enumerate(sentences)])
    by_index: dict[int, str] = {i + 1: s for i, s in enumerate(sentences)}

    try:
        response = call_llm(PROMPT.format(sentences=formatted, k=k), system=SELECTOR_SYSTEM)
    except Exception:
        return sentences[:k]

    selected: list[str] = []
    for line in response.split("\n"):
        line = line.strip()
        if not line:
            continue
        m = re.match(r"^(\d+)\s*[\).\s]\s*(.*)$", line)
        if not m:
            continue
        idx = int(m.group(1))
        if idx not in by_index:
            continue
        # Always use canonical sentence so grounding checks match notes chunks.
        selected.append(by_index[idx])

    # Dedupe preserving order
    out: list[str] = []
    seen: set[str] = set()
    for s in selected:
        if s not in seen:
            seen.add(s)
            out.append(s)

    return out[:k] if out else sentences[:k]
