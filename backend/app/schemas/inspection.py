from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional
from enum import Enum


class InspectionMetadata(BaseModel):
    firm_name: str = ""
    fei_number: str = ""
    street_address: str = ""
    city: str = ""
    state: str = ""
    zip_code: str = ""
    country: str = "United States"
    establishment_type: str = ""
    inspection_start: str = ""
    inspection_end: str = ""
    district_office: str = ""
    investigators: list[dict] = []
    report_issued_to_name: str = ""
    report_issued_to_title: str = ""

class DraftObservation(BaseModel):
    id: str = ""
    observation_text: str
    cfr_citation: str
    matched_citation: str = ""
    citation_title: str = ""
    citation_match_score: float = 0.0
    evidence_list: list[str] = []
    confidence_score: float = 0.0
    source_notes_excerpt: str = ""
    review_flags: list[str] = []

class GenerateObservationsRequest(BaseModel):
    raw_notes: str
    establishment_type: str
    cfr_parts: list[str] = []
    additional_context: dict = {}

class GenerateObservationsResponse(BaseModel):
    observations: list[DraftObservation]
    knowledge_base_refs: list[str] = []
    citation_refs: list[dict] = []


class ExtractMetadataRequest(BaseModel):
    raw_text: str


class ExtractMetadataResponse(BaseModel):
    metadata: InspectionMetadata

class RefineObservationRequest(BaseModel):
    observation: DraftObservation
    user_feedback: str

class ValidationResult(BaseModel):
    is_valid: bool
    issues: list[str] = []
    suggestions: list[str] = []

class EIRNarrative(BaseModel):
    cover_info: str = ""
    background_scope: str = ""
    observations_summary: str = ""
    evidence_descriptions: str = ""
    chronological_account: str = ""

class GenerateEIRRequest(BaseModel):
    observations: list[DraftObservation]
    inspection_metadata: InspectionMetadata
    raw_notes: str = ""

class GenerateDocumentRequest(BaseModel):
    form_data: InspectionMetadata
    observations: list[DraftObservation]

class OCRResult(BaseModel):
    text_blocks: list[dict]  # [{text, confidence}]
    full_text: str
    low_confidence_blocks: list[dict] = []

class InspectionObservation(BaseModel):
    """Maps to one row in the FY2025 Excel file."""
    id: Optional[int] = None
    fiscal_year: Optional[str] = None
    firm_name: Optional[str] = None
    fei_number: Optional[str] = None
    establishment_type: Optional[str] = None
    cfr_citation: Optional[str] = None
    observation_text: Optional[str] = None
    inspection_date: Optional[str] = None
    district: Optional[str] = None

class ObservationStats(BaseModel):
    total: int
    by_establishment_type: dict = {}
    by_cfr_part: dict = {}
    top_citations: list[dict] = []
    date_range: dict = {}

class DocumentLibraryItem(BaseModel):
    id: int
    firm_name: str
    fei_number: str
    observation_count: int
    status: str = "draft"
    created_at: datetime
    document_type: str = "483"
