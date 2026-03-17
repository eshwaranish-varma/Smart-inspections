from __future__ import annotations
import logging
import re
import uuid
from typing import Optional

from langchain_core.messages import SystemMessage, HumanMessage
from app.schemas.inspection import DraftObservation, ValidationResult, EIRNarrative, InspectionMetadata

logger = logging.getLogger(__name__)

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
                raise RuntimeError("Google API key not configured. Set GOOGLE_API_KEY in backend/.env")
            from langchain_google_genai import ChatGoogleGenerativeAI
            self._llm = ChatGoogleGenerativeAI(
                model=self.google_model,
                google_api_key=self.google_api_key,
                temperature=self.temperature,
            )
        else:
            if not self.api_key:
                raise RuntimeError("OpenAI API key not configured. Set OPENAI_API_KEY in backend/.env")
            from langchain_openai import ChatOpenAI
            self._llm = ChatOpenAI(
                api_key=self.api_key,
                model=self.model,
                temperature=self.temperature,
            )
        return self._llm
    
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
        
        return self._parse_observations_response(response.content, raw_notes)

    def extract_inspection_metadata(self, raw_text: str) -> InspectionMetadata:
        """Extract inspection metadata fields from OCR/raw company details."""
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
{raw_text[:12000]}
"""
        response = llm.invoke(
            [
                SystemMessage(content="You extract structured regulatory metadata accurately from document text."),
                HumanMessage(content=prompt),
            ]
        )

        import json

        try:
            match = re.search(r"\{.*\}", response.content, re.DOTALL)
            if match:
                payload = json.loads(match.group(0))
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
            logger.warning("Metadata extraction parse failed; using fallback parser")

        # Fallback regex extraction for key fields.
        fei_match = re.search(r"\b(\d{7,10})\b", raw_text)
        date_matches = re.findall(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", raw_text)
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
    ) -> EIRNarrative:
        """Generate EIR narrative sections."""
        llm = self._get_llm()
        
        obs_text = "\n".join(f"{i+1}. {o.observation_text}" for i, o in enumerate(observations))
        meta = inspection_metadata
        
        user_prompt = f"""Generate an Establishment Inspection Report (EIR) narrative for:

Firm: {meta.get('firm_name', 'Unknown')}
FEI: {meta.get('fei_number', '')}
Dates: {meta.get('inspection_start', '')} to {meta.get('inspection_end', '')}
Type: {meta.get('establishment_type', '')}

OBSERVATIONS:
{obs_text}

RAW NOTES:
{raw_notes[:3000]}

Generate the EIR with these sections (return as JSON):
{{
  "cover_info": "Header and identification info",
  "background_scope": "Background and scope of inspection",
  "observations_summary": "Summary of all observations",
  "evidence_descriptions": "Detailed evidence descriptions",
  "chronological_account": "Chronological account of the inspection"
}}

Return ONLY valid JSON."""

        response = llm.invoke([
            SystemMessage(content="You are an FDA inspection report writer. Generate professional, factual EIR narratives."),
            HumanMessage(content=user_prompt),
        ])
        
        import json
        try:
            json_match = re.search(r'\{.*\}', response.content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return EIRNarrative(**data)
        except (json.JSONDecodeError, Exception):
            pass
        
        return EIRNarrative(observations_summary=response.content)
    
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
        
        observation.observation_text = response.content.strip()
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
