from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime
from typing import Optional
from enum import Enum


class EIRObservationAtomic(BaseModel):
    """Atomic unit for EIR validation (maps from DraftObservation / 483 rows)."""

    observation_id: str
    raw_text: str
    citations: list[str] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    source_reference: Optional[str] = None


class SegmentedObservation(BaseModel):
    """One distinct issue extracted from raw notes (segmentation stage; before 483 drafting)."""

    obs_id: str
    raw_text: str
    evidence: list[str] = Field(default_factory=list)


class ObservationInput(BaseModel):
    """Single observation fed into the strict per-row FDA 483 draft LLM (before generation)."""

    obs_id: str
    raw_text: str
    evidence: list[str]
    cfr_candidates: list[str] = Field(default_factory=list)
    retrieval_context: str = Field(
        default="",
        description="Pre-retrieved excerpts from inspection notes + KB (Phase 1 retrieval); augments the prompt.",
    )
    evidence_mode: str | None = Field(
        default=None,
        description="strict | balanced; default uses server EVIDENCE_MODE",
    )


class ObservationOutput(BaseModel):
    """Strict LLM output for one observation (one JSON object per call)."""

    obs_id: str
    drafted_text: str
    evidence_used: list[str] = Field(default_factory=list)
    cfr_citation: str | None = None
    evidence_grounding_types: list[str] = Field(
        default_factory=list,
        description="Per-item grounding type: exact_match | fuzzy_match | extracted_fallback",
    )


class Draft483Response(BaseModel):
    status: str = "success"
    count: int
    observations: list[ObservationOutput]


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
    investigator_signature_type: str = ""
    investigator_signature_text: str = ""
    investigator_signature_image: str = ""
    investigator_signed_name: str = ""
    investigator_signed_at: str = ""
    supervisor_signature_type: str = ""
    supervisor_signature_text: str = ""
    supervisor_signature_image: str = ""
    supervisor_signed_name: str = ""
    supervisor_signed_at: str = ""

class ObservationValidation(BaseModel):
    """Visible AI validation layer for regulatory review."""

    cfr_valid: bool = False
    evidence_linked: bool = False
    language_quality: str = Field(default="weak", description="strong | weak")
    issues: list[str] = Field(default_factory=list)


class EvidenceSourceItem(BaseModel):
    file_id: str = ""
    page: int = 1
    highlight_text: str = ""


class DraftObservation(BaseModel):
    id: str = ""
    observation_text: str
    cfr_citation: str
    matched_citation: str = ""
    citation_title: str = ""
    citation_match_score: float = 0.0
    citation_volume_label: str = Field(
        default="",
        description="eCFR-style volume label from matched Title 21 row (CSV/XML)",
    )
    citation_part_label: str = Field(default="", description="21 CFR part label from matched reference")
    citation_chapter_label: str = Field(default="", description="Chapter label from matched reference")
    citation_subchapter_label: str = Field(default="", description="Subchapter label from matched reference")
    evidence_list: list[str] = []
    confidence_score: float = 0.0
    confidence: float = Field(
        default=0.0,
        description="Pipeline confidence (weighted: mapping, evidence, structure, CFR); mirrors confidence_score",
    )
    pipeline_status: str = Field(
        default="pass",
        description="pass | warning | failed — outcome of pipeline checks for this row",
    )
    failure_reason: str | None = Field(
        default=None,
        description="Primary issue when status is warning/failed (e.g. evidence_not_grounded)",
    )
    pipeline_status_color: str = Field(
        default="green",
        description="UI hint: green | yellow | red from pipeline_status",
    )
    source_notes_excerpt: str = ""
    review_flags: list[str] = []
    validation: ObservationValidation | None = None
    evidence_sources: list[EvidenceSourceItem] = Field(default_factory=list)
    evidence_grounding_types: list[str] = Field(
        default_factory=list,
        description="Per evidence_list item: exact_match | fuzzy_match | extracted_fallback",
    )
    cfr_reference: str = Field(
        default="",
        description="Canonical CFR string for traceability (defaults to cfr_citation)",
    )
    confidence_breakdown: dict | None = Field(
        default=None,
        description="Weighted components: grounding_f1, cfr_score, structure_score, retrieval_score",
    )

class GenerateObservationsRequest(BaseModel):
    raw_notes: str
    establishment_type: str
    cfr_parts: list[str] = []
    additional_context: dict = {}
    ground_truth: str | None = Field(
        default=None,
        description="Optional reference text for WER-based ocr_accuracy in evaluation metrics",
    )
    inspection_id: str | None = Field(
        default=None,
        description="Workflow inspection UUID to associate this evaluation run with an assignment",
    )
    inspection_title: str | None = Field(
        default=None,
        description="Human-readable inspection assignment title (e.g. eNSpect workflow title)",
    )
    skip_observation_count_estimate: bool = Field(
        default=False,
        description="Legacy field: ignored. Pipeline uses LLM segmentation then per-observation drafting.",
    )
    refinement_feedback: str | None = Field(
        default=None,
        description=(
            "Optional prior evaluation / QA text appended to the draft prompt so the model can fix grounding "
            "issues without inventing new facts (second pass)."
        ),
    )

class PipelineStatusSummary(BaseModel):
    """Run-level counts by pipeline_status (JSON key `pass` for pass rows)."""

    pass_n: int = Field(default=0, serialization_alias="pass")
    warning: int = 0
    failed: int = 0


class GenerateObservationsRunMetrics(BaseModel):
    """Summarized scores for dashboards (subset of full evaluation)."""

    true_positive_rate: float = Field(
        default=0.0,
        description="Share of observations with pipeline_status pass",
    )
    evidence_score: float | None = Field(
        default=None,
        description="Run-level grounding F1 micro when present",
    )
    cfr_valid: bool | None = Field(
        default=None,
        description="Aggregate CFR validity; null when cfr_parts were not supplied",
    )
    summary: PipelineStatusSummary = Field(
        default_factory=PipelineStatusSummary,
        description="Distribution: pass / warning / failed counts",
    )
    avg_confidence: float | None = Field(
        default=None,
        description="Mean observation confidence (0.3*F1 + 0.3*CFR + 0.2*structure + 0.2*retrieval)",
    )
    avg_grounding_f1: float | None = Field(
        default=None,
        description="Mean grounding F1 component used inside confidence",
    )
    avg_cfr_score: float | None = Field(
        default=None,
        description="Mean CFR similarity component used inside confidence",
    )
    avg_retrieval_score: float | None = Field(
        default=None,
        description="Mean retrieval similarity component used inside confidence",
    )


class GenerateObservationsResponse(BaseModel):
    status: str = Field(default="success", description="HTTP-level outcome for this generation run")
    run_timestamp: str = Field(
        ...,
        description="UTC instant when this generation run completed (ISO 8601, Z suffix)",
    )
    observations: list[DraftObservation]
    knowledge_base_refs: list[str] = []
    citation_refs: list[dict] = []
    doc_id: str | None = None
    evaluation: dict | None = None
    expected_observation_count: int | None = Field(
        default=None,
        description="Estimated distinct issues in raw/OCR notes (pre-draft analysis)",
    )
    drafted_observation_count: int | None = Field(
        default=None,
        description="Number of drafted observations returned",
    )
    count_matches_expectation: bool | None = Field(
        default=None,
        description="True when drafted count equals expected count from source analysis",
    )
    observation_count_rationale: str | None = Field(
        default=None,
        description="Short model rationale for the expected observation count",
    )
    segmented_count: int | None = Field(
        default=None,
        description="Distinct issues extracted in segmentation step (before per-observation drafting)",
    )
    drafted_count: int | None = Field(
        default=None,
        description="Same as drafted_observation_count when using segmentation pipeline; explicit for UI",
    )
    mapping_valid: bool | None = Field(
        default=None,
        description="True when segmented_count equals drafted_count (1:1 pipeline health)",
    )
    segmentation_valid: bool | None = Field(
        default=None,
        description="False when a lightweight heuristic suspects merged issues (see segmentation_warning)",
    )
    segmentation_warning: bool | None = Field(
        default=None,
        description="True when period-count heuristic suggests fewer segments than expected from raw text",
    )
    segmentation_note: str | None = Field(
        default=None,
        description="Plain-language explanation when segmentation_warning is true",
    )
    summary: PipelineStatusSummary | None = Field(
        default=None,
        description="Run-level pass / warning / failed counts (same as metrics.summary)",
    )
    pipeline_integrity: bool | None = Field(
        default=None,
        description="mapping_valid and segmentation_valid — headline KPI for demos",
    )
    observation_count_mismatch_warning: str | None = Field(
        default=None,
        description="Non-null warning string when segmented vs drafted count mismatch is detected",
    )
    metrics: GenerateObservationsRunMetrics | None = Field(
        default=None,
        description="Compact metrics block (TP rate, evidence, CFR) for dashboards",
    )
    pipeline_run_id: str | None = Field(
        default=None,
        description="UUID of the pipeline_runs row in PostgreSQL (Supabase) when AI pipeline logging succeeded",
    )


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
    """Narrative body for Establishment Inspection Report (IOM-style; ties to Form FDA 483 items)."""

    model_config = ConfigDict(extra="ignore")

    cover_info: str = ""
    purpose_scope: str = ""
    regulatory_framework: str = ""
    background_scope: str = ""
    inspection_methodology: str = ""
    observations_summary: str = ""
    evidence_descriptions: str = ""
    chronological_account: str = ""
    references_and_citations: str = ""

class GenerateEIRRequest(BaseModel):
    observations: list[DraftObservation]
    inspection_metadata: InspectionMetadata
    raw_notes: str = ""
    strict_eir_coverage: bool = Field(
        default=False,
        description="If True, fail with 422 when the LLM omits observations instead of synthesizing traceability.",
    )


class EIROneToOneSection(BaseModel):
    """Single EIR narrative block tied to one 483 observation (strict 1:1 pipeline)."""

    observation_id: str
    eir_text: str = ""


class GenerateEIROneToOneBody(BaseModel):
    """Approved 483 rows to expand into EIR sections (one section per observation)."""

    observations: list[DraftObservation] = Field(..., min_length=1)


class GenerateEIROneToOneResponse(BaseModel):
    status: str = "success"
    inspection_id: str = ""
    total_observations: int = 0
    sections: list[EIROneToOneSection] = Field(default_factory=list)
    validation_ok: bool = True
    validation_message: str = ""
    tp_score: float = 0.0


class EIRPipelineObservationLink(BaseModel):
    """Evidence-to-text traceability for EIR narrative (links to Form FDA 483 items)."""

    observation_index: int = 0
    observation_id: str = ""
    cfr_citation: str = ""
    evidence_sources: list[str] = []
    compliance_discussion: str = ""


class EIRPipelineNarrative(EIRNarrative):
    """Post–483 EIR draft: structured narrative plus explicit 483/evidence linkage (not the 483 drafting prompt)."""

    traceability: list[EIRPipelineObservationLink] = []
    coverage: float | None = Field(default=None, ge=0.0, le=1.0, description="Included observations / input count")
    observation_coverage_valid: bool | None = Field(
        default=None,
        description="True when the LLM emitted full traceability without recovery synthesis",
    )
    missing_observation_ids: list[str] = Field(default_factory=list)
    eir_total_observations: int | None = Field(default=None, description="Input 483 observation count")
    eir_observations_included: int | None = Field(default=None, description="Count covered in output (after recovery)")
    eir_coverage_recovered: bool | None = Field(
        default=None,
        description="True when traceability/narrative gaps were filled from source 483 text",
    )
    eir_llm_missing_observation_ids: list[str] = Field(
        default_factory=list,
        description="Observation ids the LLM omitted before recovery synthesis (empty if LLM was complete)",
    )


class GenerateDocumentRequest(BaseModel):
    form_data: InspectionMetadata
    observations: list[DraftObservation]
    raw_notes: str = ""
    eir_narrative: EIRNarrative | None = Field(
        default=None,
        description="When set, skip LLM EIR generation and render this narrative (e.g. document library replay).",
    )

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
