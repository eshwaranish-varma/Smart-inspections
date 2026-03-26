from __future__ import annotations
import json
import logging
import re
import uuid
from typing import Optional

from langchain_core.messages import SystemMessage, HumanMessage
from app.schemas.inspection import (
    DraftObservation,
    EIRPipelineNarrative,
    EIRPipelineObservationLink,
    ValidationResult,
    EIRNarrative,
    InspectionMetadata,
)

logger = logging.getLogger(__name__)

_EIR_CAMEL_TO_SNAKE = {
    "coverInfo": "cover_info",
    "purposeScope": "purpose_scope",
    "regulatoryFramework": "regulatory_framework",
    "backgroundScope": "background_scope",
    "inspectionMethodology": "inspection_methodology",
    "observationsSummary": "observations_summary",
    "evidenceDescriptions": "evidence_descriptions",
    "chronologicalAccount": "chronological_account",
    "referencesAndCitations": "references_and_citations",
}


def _parse_eir_json_from_llm_reply(reply: str) -> dict | None:
    """Extract a JSON object from LLM output (markdown fences, balanced braces via json.raw_decode)."""
    text = (reply or "").strip()
    if not text:
        return None
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    candidate = fence.group(1).strip() if fence else text
    start = candidate.find("{")
    if start < 0:
        return None
    try:
        obj, _ = json.JSONDecoder().raw_decode(candidate[start:])
        return obj if isinstance(obj, dict) else None
    except json.JSONDecodeError:
        return None


def _coerce_eir_dict(raw: dict) -> dict:
    """Map camelCase keys and keep only EIRNarrative fields."""
    out: dict = {}
    for k, v in raw.items():
        nk = _EIR_CAMEL_TO_SNAKE.get(k, k)
        key = nk if nk in EIRNarrative.model_fields else (k if k in EIRNarrative.model_fields else None)
        if key is None:
            continue
        out[key] = "" if v is None else str(v)
    return out


def _coerce_eir_pipeline_dict(raw: dict) -> dict:
    """EIR narrative fields plus traceability array."""
    base = _coerce_eir_dict({k: v for k, v in raw.items() if k != "traceability"})
    tr_out: list[dict] = []
    tr = raw.get("traceability")
    if isinstance(tr, list):
        for item in tr:
            if not isinstance(item, dict):
                continue
            tr_out.append(
                {
                    "observation_index": int(item.get("observation_index", 0) or 0),
                    "observation_id": str(item.get("observation_id", "") or ""),
                    "cfr_citation": str(item.get("cfr_citation", "") or ""),
                    "evidence_sources": list(item.get("evidence_sources") or []),
                    "compliance_discussion": str(item.get("compliance_discussion", "") or ""),
                }
            )
    base["traceability"] = tr_out
    return base


def _fill_empty_eir_sections(narrative: EIRNarrative, observations: list[DraftObservation]) -> EIRNarrative:
    """Ensure sections 5–8 have content when the model omits or truncates them."""
    d = narrative.model_dump()

    def _blank(s: str | None) -> bool:
        return not (s or "").strip()

    cfrs = sorted({(o.cfr_citation or "").strip() for o in observations if (o.cfr_citation or "").strip()})

    if _blank(d.get("observations_summary")):
        parts = [
            f"Observation {i} ({o.cfr_citation or 'CFR pending'}): {o.observation_text or '(no text)'}"
            for i, o in enumerate(observations, 1)
        ]
        d["observations_summary"] = "\n\n".join(parts) if parts else ""

    if _blank(d.get("evidence_descriptions")):
        lines = []
        for i, o in enumerate(observations, 1):
            ev = "; ".join(e for e in (o.evidence_list or []) if (e or "").strip())
            if ev:
                lines.append(f"Observation {i}: {ev}")
        d["evidence_descriptions"] = (
            "\n".join(lines)
            if lines
            else "Objective evidence is summarized in the Detailed findings table and in the raw inspection notes."
        )

    if _blank(d.get("chronological_account")):
        d["chronological_account"] = (
            "Inspection activities proceeded in line with the areas and records reflected in the observations above. "
            "Use the source notes excerpts and firm records for specific dates and sequence detail."
        )

    if _blank(d.get("references_and_citations")):
        d["references_and_citations"] = (
            "\n".join(f"• {c}" for c in cfrs) if cfrs else "• 21 CFR citations as cited for each observation above."
        )

    return EIRNarrative.model_validate(d)

EIR_PIPELINE_SYSTEM_PROMPT = """You are an FDA ORA investigator drafting the **Establishment Inspection Report (EIR)** after Form FDA 483 has been finalized and transmitted.
Your task is **EIR narrative and compliance discussion only** — not Form FDA 483 language. Expand observations into inspection narrative: scope, methodology, objective findings, evidence, and regulatory discussion.
Ground every substantive claim in the structured 483 observations, raw notes, and evidence sources provided. Maintain **explicit traceability**: each 483 item must map to narrative discussion and evidence references.
Use professional ORA documentation tone. Do not name individuals. Output valid JSON only (no markdown fences)."""

EIR_SYSTEM_PROMPT = """You are an FDA ORA investigator drafting the **narrative portion** of an Establishment Inspection Report (EIR).
Ground every statement in: (1) the inspection observations and raw notes provided, (2) **21 CFR** where applicable, and (3) **Investigations Operations Manual (IOM)** practice for inspection documentation (e.g., describing scope, methodology, findings, and evidence in a factual, objective tone).

Requirements:
- Align the **substance** of findings with the draft Form FDA 483 observations: same CFR citations and themes; expand with narrative context suitable for an EIR (background, how the condition was documented, records or physical evidence reviewed).
- Use clear regulatory language; cite **21 CFR** sections explicitly where tied to each finding (e.g., "21 CFR 211.22(a)").
- Reference IOM expectations only where appropriate (e.g., documentation of inspection activities, evidence gathering)—do not invent IOM section numbers; speak generically to IOM practice when needed.
- Preserve **evidence** from the input notes (lot numbers, record IDs, dates, sample IDs) when present.
- Do not name individuals; use titles. Do not name non-inspected firms except as "the firm" or as in the provided metadata.
- Output must be valid JSON only (no markdown fences), matching the exact keys requested in the user message."""

SYSTEM_PROMPT = """You are an expert FDA investigator assistant trained on the Investigations Operations Manual (IOM) and Title 21 CFR. Your role is to help draft Form FDA 483 inspectional observations from raw inspection notes.

CRITICAL RULES:
1. Every observation must answer: Who, What, When, Where, Why, How Much/Often
2. Apply the "So What?" test — state WHY the condition is significant
3. Use factual, objective language — no conclusions, no legal determinations
4. Cite specific evidence: lot numbers, record numbers, counts (e.g., "3 of 10 records reviewed")
5. Do NOT name individuals by name — use titles (e.g., "QC Manager", "Analyst A")
6. Do NOT name supplier/consignee firms — use "Firm A", "Firm B"
7. Do NOT cite FDA guidance documents or policy — only cite 21 CFR regulations
8. Use present tense for conditions that are ongoing
9. Each observation is ONE condition or practice. Split compound observations.
10. Format: Lead with the regulatory deficiency statement, then provide supporting evidence/examples"""


class AIService:
    def __init__(
        self,
        provider: str = "google",
        api_key: str = "",
        google_api_key: str = "",
        model: str = "gpt-4o",
        google_model: str = "gemini-2.0-flash",
        temperature: float = 0.1,
    ):
        self.provider = provider
        self.api_key = api_key
        self.google_api_key = google_api_key
        self.model = model
        self.google_model = google_model
        self.temperature = temperature
        self._llm = None

    def _get_llm(self):
        if self._llm is not None:
            return self._llm

        if self.provider == "google":
            if not self.google_api_key:
                raise RuntimeError("Google API key not configured. Set GOOGLE_API_KEY in the repository root `.env`")
            from langchain_google_genai import ChatGoogleGenerativeAI
            self._llm = ChatGoogleGenerativeAI(
                model=self.google_model,
                google_api_key=self.google_api_key,
                temperature=self.temperature,
            )
        else:
            if not self.api_key:
                raise RuntimeError("OpenAI API key not configured. Set OPENAI_API_KEY in the repository root `.env`")
            from langchain_openai import ChatOpenAI
            self._llm = ChatOpenAI(
                api_key=self.api_key,
                model=self.model,
                temperature=self.temperature,
            )
        return self._llm

    @staticmethod
    def _llm_text(response) -> str:
        """Normalize LangChain AIMessage content (Gemini often returns list blocks, not a plain string)."""
        c = getattr(response, "content", None)
        if c is None:
            return ""
        if isinstance(c, str):
            return c
        if isinstance(c, list):
            parts: list[str] = []
            for block in c:
                if isinstance(block, str):
                    parts.append(block)
                elif isinstance(block, dict):
                    parts.append(str(block.get("text", "") or ""))
                else:
                    parts.append(str(block))
            return "".join(parts)
        return str(c)

    @staticmethod
    def _metadata_str_fields() -> tuple[str, ...]:
        return (
            "firm_name",
            "fei_number",
            "street_address",
            "city",
            "state",
            "zip_code",
            "country",
            "establishment_type",
            "inspection_start",
            "inspection_end",
            "district_office",
            "report_issued_to_name",
            "report_issued_to_title",
        )

    def _sanitize_metadata_payload(self, payload: dict) -> dict:
        """LLMs may emit JSON null; Pydantic str fields reject None."""
        out = dict(payload)
        for key in self._metadata_str_fields():
            val = out.get(key)
            out[key] = "" if val is None else str(val)
        return out

    def generate_observations(
        self,
        raw_notes: str,
        establishment_type: str,
        cfr_parts: list[str],
        kb_context: list[str] = None,
        example_483: str = "",
    ) -> list[DraftObservation]:
        """Generate draft FDA 483 observations from raw inspection notes."""
        llm = self._get_llm()
        
        kb_text = "\n---\n".join(kb_context or [])
        cfr_text = ", ".join(cfr_parts) if cfr_parts else "applicable 21 CFR parts"
        
        user_prompt = f"""Based on the following raw inspection notes from a {establishment_type} facility, generate Form FDA 483 observations.

Applicable CFR parts: {cfr_text}

RELEVANT IOM REGULATORY GUIDANCE:
{kb_text[:3000] if kb_text else "No additional guidance available."}

{f"EXAMPLE OF A WELL-WRITTEN 483 (for reference only):{chr(10)}{example_483[:2000]}" if example_483 else ""}

RAW INSPECTION NOTES:
{raw_notes}

Generate observations in this JSON format (return a JSON array):
[
  {{
    "observation_text": "The firm's [specific deficiency]...",
    "cfr_citation": "21 CFR XXX.XX",
    "evidence_list": ["Evidence item 1", "Evidence item 2"],
    "source_notes_excerpt": "relevant excerpt from the raw notes",
    "review_flags": ["any concerns for human reviewer"]
  }}
]

Generate between 1-6 observations. Each must be a SEPARATE condition. Return ONLY valid JSON."""

        response = llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=user_prompt),
        ])

        return self._parse_observations_response(self._llm_text(response), raw_notes)

    def extract_inspection_metadata(self, raw_text: str) -> InspectionMetadata:
        """Extract inspection metadata fields from OCR/raw company details."""
        text = (raw_text or "").strip()
        if len(text) < 20:
            raise RuntimeError(
                "Not enough text was extracted from the file for metadata extraction. "
                "Try a clearer PDF or image, or ensure Tesseract OCR is installed on the server for scanned documents."
            )
        llm = self._get_llm()
        prompt = f"""Extract structured FDA inspection metadata from this document text.

Return ONLY valid JSON matching this exact shape:
{{
  "firm_name": "",
  "fei_number": "",
  "street_address": "",
  "city": "",
  "state": "",
  "zip_code": "",
  "country": "United States",
  "establishment_type": "",
  "inspection_start": "",
  "inspection_end": "",
  "district_office": "",
  "investigators": [{{"name": "", "title": ""}}],
  "report_issued_to_name": "",
  "report_issued_to_title": ""
}}

Rules:
- Keep unknown fields as empty string.
- FEI should contain only digits.
- Dates should be in YYYY-MM-DD when present.
- investigators should be an array (can be empty).

SOURCE TEXT:
{text[:12000]}
"""
        response = llm.invoke(
            [
                SystemMessage(content="You extract structured regulatory metadata accurately from document text."),
                HumanMessage(content=prompt),
            ]
        )

        import json

        reply = self._llm_text(response)
        try:
            match = re.search(r"\{.*\}", reply, re.DOTALL)
            if match:
                payload = json.loads(match.group(0))
                payload = self._sanitize_metadata_payload(payload)
                # Normalize FEI digits and guard investigator shape.
                payload["fei_number"] = re.sub(r"\D+", "", str(payload.get("fei_number", "")))
                investigators = payload.get("investigators", [])
                if not isinstance(investigators, list):
                    investigators = []
                payload["investigators"] = [
                    {"name": str(inv.get("name", "")).strip(), "title": str(inv.get("title", "")).strip()}
                    for inv in investigators
                    if isinstance(inv, dict)
                ]
                return InspectionMetadata(**payload)
        except Exception:
            logger.warning("Metadata extraction parse failed; using fallback parser", exc_info=True)

        # Fallback regex extraction for key fields.
        fei_match = re.search(r"\b(\d{7,10})\b", text)
        date_matches = re.findall(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", text)
        return InspectionMetadata(
            fei_number=fei_match.group(1) if fei_match else "",
            inspection_start=date_matches[0] if len(date_matches) > 0 else "",
            inspection_end=date_matches[1] if len(date_matches) > 1 else "",
        )
    
    def _parse_observations_response(self, content: str, raw_notes: str) -> list[DraftObservation]:
        """Parse LLM response into DraftObservation objects."""
        import json
        
        json_match = re.search(r'\[.*\]', content, re.DOTALL)
        if not json_match:
            logger.warning("Could not parse JSON from LLM response, creating single observation")
            return [DraftObservation(
                id=str(uuid.uuid4())[:8],
                observation_text=content.strip(),
                cfr_citation="",
                evidence_list=[],
                confidence_score=0.5,
                source_notes_excerpt=raw_notes[:200],
                review_flags=["Could not parse structured response - manual review required"],
            )]
        
        try:
            items = json.loads(json_match.group())
        except json.JSONDecodeError:
            return [DraftObservation(
                id=str(uuid.uuid4())[:8],
                observation_text=content.strip(),
                cfr_citation="",
                confidence_score=0.4,
                review_flags=["JSON parse error - manual review required"],
            )]
        
        observations = []
        for item in items:
            obs = DraftObservation(
                id=str(uuid.uuid4())[:8],
                observation_text=item.get("observation_text", ""),
                cfr_citation=item.get("cfr_citation", ""),
                evidence_list=item.get("evidence_list", []),
                confidence_score=self._score_observation(item.get("observation_text", "")),
                source_notes_excerpt=item.get("source_notes_excerpt", ""),
                review_flags=item.get("review_flags", []),
            )
            observations.append(obs)
        
        return observations
    
    def _score_observation(self, text: str) -> float:
        """Heuristic confidence scoring."""
        score = 0.5
        if any(w in text.lower() for w in ["specifically", "reviewed", "observed"]):
            score += 0.1
        if re.search(r'\d+ of \d+', text):
            score += 0.1
        if re.search(r'21 CFR', text):
            score += 0.1
        if len(text) > 200:
            score += 0.1
        if any(w in text.lower() for w in ["manager", "analyst", "operator", "supervisor"]):
            score += 0.05
        return min(score, 1.0)
    
    def generate_eir_narrative(
        self,
        observations: list[DraftObservation],
        inspection_metadata: dict,
        raw_notes: str = "",
        kb_context: Optional[list[str]] = None,
    ) -> EIRNarrative:
        """Generate EIR narrative sections (IOM-aligned outline; CFR/IOM-informed)."""
        llm = self._get_llm()

        obs_lines = []
        for i, o in enumerate(observations, start=1):
            ev = "; ".join(e for e in (o.evidence_list or []) if (e or "").strip())
            obs_lines.append(
                f"--- Observation {i} ---\n"
                f"Text: {o.observation_text}\n"
                f"CFR: {o.cfr_citation}\n"
                f"Evidence list: {ev}\n"
                f"Source notes excerpt: {o.source_notes_excerpt}\n"
            )
        obs_text = "\n".join(obs_lines) if obs_lines else "(No structured observations provided.)"
        meta = inspection_metadata

        kb_text = "\n---\n".join(kb_context or [])[:6000]
        if not kb_text.strip():
            kb_text = "No additional knowledge-base excerpts."

        user_prompt = f"""Draft the **Establishment Inspection Report (EIR) narrative** for the inspection below.

FIRM METADATA:
- Firm: {meta.get('firm_name', 'Unknown')}
- FEI: {meta.get('fei_number', '')}
- Address: {meta.get('street_address', '')}, {meta.get('city', '')}, {meta.get('state', '')} {meta.get('zip_code', '')}
- Inspection dates: {meta.get('inspection_start', '')} to {meta.get('inspection_end', '')}
- District: {meta.get('district_office', '')}
- Establishment type: {meta.get('establishment_type', '')}

DRAFT FORM FDA 483 OBSERVATIONS (authoritative list — narrative must align):
{obs_text}

RAW INSPECTION NOTES / EXTRACTS (tables, checklist text, free text):
{raw_notes[:12000]}

SUPPLEMENTAL REGULATORY CONTEXT (excerpts; use only to support wording — do not contradict observations above):
{kb_text}

Return a single JSON **object** using **exactly these snake_case keys** (all string values). Every key must be present. Do not use camelCase.
Do not leave long-form narrative fields empty: sections observations_summary through references_and_citations must each contain at least one substantive paragraph or bullet list drawn from the observations and notes.
{{
  "cover_info": "",
  "purpose_scope": "",
  "regulatory_framework": "",
  "background_scope": "",
  "inspection_methodology": "",
  "observations_summary": "Discussion of findings: tie each observation to 21 CFR and evidence.",
  "evidence_descriptions": "Records, lots, logs, samples, and other objective evidence.",
  "chronological_account": "Sequence of significant inspection activities.",
  "references_and_citations": "21 CFR list and IOM references as appropriate."
}}

Return ONLY valid JSON (markdown code fences optional)."""

        response = llm.invoke(
            [
                SystemMessage(content=EIR_SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ]
        )

        reply = self._llm_text(response)

        narrative: EIRNarrative | None = None
        data = _parse_eir_json_from_llm_reply(reply)
        if data:
            try:
                coerced = _coerce_eir_dict(data)
                narrative = EIRNarrative.model_validate(coerced)
            except Exception as e:
                logger.warning("EIR model_validate failed: %s", e, exc_info=True)
        if narrative is None:
            logger.warning("EIR JSON not parsed; using fallback narrative body")
            narrative = EIRNarrative(observations_summary=reply)

        return _fill_empty_eir_sections(narrative, observations)

    def generate_eir_pipeline_narrative(
        self,
        observations: list[DraftObservation],
        inspection_metadata: dict,
        raw_notes: str = "",
        kb_context: Optional[list[str]] = None,
    ) -> EIRPipelineNarrative:
        """EIR generation for post–483 workflow: narrative + traceability; uses EIR_PIPELINE_SYSTEM_PROMPT (not 483 drafting)."""
        llm = self._get_llm()

        obs_lines = []
        for i, o in enumerate(observations, start=1):
            ev = "; ".join(e for e in (o.evidence_list or []) if (e or "").strip())
            obs_lines.append(
                f"--- Form FDA 483 observation {i} (id={o.id}) ---\n"
                f"Text: {o.observation_text}\n"
                f"CFR: {o.cfr_citation}\n"
                f"Evidence list: {ev}\n"
                f"Source notes excerpt: {o.source_notes_excerpt}\n"
            )
        obs_text = "\n".join(obs_lines) if obs_lines else "(No structured observations provided.)"
        meta = inspection_metadata

        kb_text = "\n---\n".join(kb_context or [])[:6000]
        if not kb_text.strip():
            kb_text = "No additional knowledge-base excerpts."

        user_prompt = f"""Produce the **Establishment Inspection Report (EIR)** narrative sections below. Form FDA 483 has already been issued; this EIR must **reference and expand** those observations with narrative context, evidence description, and compliance discussion.

FIRM / INSPECTION METADATA:
- Firm: {meta.get('firm_name', 'Unknown')}
- FEI: {meta.get('fei_number', '')}
- Address: {meta.get('street_address', '')}, {meta.get('city', '')}, {meta.get('state', '')} {meta.get('zip_code', '')}
- Inspection dates: {meta.get('inspection_start', '')} to {meta.get('inspection_end', '')}
- District: {meta.get('district_office', '')}
- Establishment type: {meta.get('establishment_type', '')}

AUTHORITATIVE FORM FDA 483 OBSERVATIONS (expand these in narrative; do not contradict):
{obs_text}

RAW INSPECTION NOTES / OCR / SUPPORTING TEXT:
{raw_notes[:12000]}

SUPPLEMENTAL REGULATORY CONTEXT (support wording only):
{kb_text}

Return a single JSON **object** with **exactly these snake_case keys** (all string values except `traceability` which is an array):
- cover_info, purpose_scope, regulatory_framework, background_scope, inspection_methodology
- observations_summary: narrative discussion tying each 483 observation to findings (numbered cross-references).
- evidence_descriptions: objective evidence (records, samples, dates) linked to observations.
- chronological_account: significant inspection activity sequence.
- references_and_citations: 21 CFR and other citations as appropriate.
- traceability: array of objects, **one per 483 observation**, each with:
  - observation_index (1-based int), observation_id (string), cfr_citation (string)
  - evidence_sources (array of strings — specific evidence refs)
  - compliance_discussion (string — narrative paragraph for that observation)

Return ONLY valid JSON (markdown fences optional)."""

        response = llm.invoke(
            [
                SystemMessage(content=EIR_PIPELINE_SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ]
        )

        reply = self._llm_text(response)
        narrative: EIRPipelineNarrative | None = None
        data = _parse_eir_json_from_llm_reply(reply)
        if data:
            try:
                narrative = EIRPipelineNarrative.model_validate(_coerce_eir_pipeline_dict(data))
            except Exception as e:
                logger.warning("EIR pipeline model_validate failed: %s", e, exc_info=True)
        if narrative is None:
            narrative = EIRPipelineNarrative(observations_summary=reply)

        base = EIRNarrative.model_validate(narrative.model_dump(exclude={"traceability"}))
        filled = _fill_empty_eir_sections(base, observations)
        trace_list: list[EIRPipelineObservationLink] = list(narrative.traceability or [])
        if not trace_list and observations:
            trace_list = [
                EIRPipelineObservationLink(
                    observation_index=i,
                    observation_id=o.id or "",
                    cfr_citation=o.cfr_citation or "",
                    evidence_sources=list(o.evidence_list or [])[:12],
                    compliance_discussion=(o.observation_text or "")[:2000],
                )
                for i, o in enumerate(observations, start=1)
            ]
        merged = {**filled.model_dump(), "traceability": trace_list}
        return EIRPipelineNarrative.model_validate(merged)

    def refine_observation(self, observation: DraftObservation, feedback: str) -> DraftObservation:
        """Refine an observation based on user feedback."""
        llm = self._get_llm()
        
        response = llm.invoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=f"""Refine this FDA 483 observation based on the reviewer's feedback.

CURRENT OBSERVATION:
{observation.observation_text}

CFR Citation: {observation.cfr_citation}

REVIEWER FEEDBACK:
{feedback}

Return the improved observation text only (no JSON, no explanation)."""),
        ])
        
        observation.observation_text = self._llm_text(response).strip()
        observation.review_flags = ["Refined based on feedback"]
        return observation
    
    def validate_observation(self, observation: DraftObservation) -> ValidationResult:
        """Validate a draft observation against FDA requirements."""
        issues = []
        suggestions = []
        
        text = observation.observation_text
        
        if not re.search(r'21 CFR \d+\.\d+', observation.cfr_citation):
            issues.append("CFR citation format should be '21 CFR XXX.XX'")
        
        if not text or len(text) < 50:
            issues.append("Observation text is too short")
        
        name_patterns = [r'\b[A-Z][a-z]+ [A-Z][a-z]+\b']
        for p in name_patterns:
            if re.search(p, text) and not any(t in text for t in ["Firm A", "Firm B", "Analyst A"]):
                suggestions.append("Check: possible individual name found. Use titles instead.")
        
        if not re.search(r'\d+ (of|out of) \d+', text):
            suggestions.append("Consider adding population ratio (e.g., '3 of 10 records reviewed')")
        
        required_elements = {
            "what": bool(re.search(r'(observed|noted|found|reviewed|determined)', text.lower())),
            "when": bool(re.search(r'(on |during |between |dated |\d{1,2}/\d{1,2}/\d{2,4})', text.lower())),
            "evidence": bool(re.search(r'(record|batch|lot|document|report|log)', text.lower())),
        }
        
        for element, found in required_elements.items():
            if not found:
                suggestions.append(f"Consider adding '{element}' detail to the observation")
        
        return ValidationResult(
            is_valid=len(issues) == 0,
            issues=issues,
            suggestions=suggestions,
        )
