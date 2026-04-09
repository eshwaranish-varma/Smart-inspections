export interface InspectionMetadata {
  firm_name: string;
  fei_number: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  establishment_type: string;
  inspection_start: string;
  inspection_end: string;
  district_office: string;
  investigators: { name: string; title: string }[];
  report_issued_to_name: string;
  report_issued_to_title: string;
  investigator_signature_type?: string;
  investigator_signature_text?: string;
  investigator_signature_image?: string;
  investigator_signed_name?: string;
  investigator_signed_at?: string;
  supervisor_signature_type?: string;
  supervisor_signature_text?: string;
  supervisor_signature_image?: string;
  supervisor_signed_name?: string;
  supervisor_signed_at?: string;
}

export interface ObservationValidationLayer {
  cfr_valid: boolean;
  evidence_linked: boolean;
  language_quality: "strong" | "weak";
  issues: string[];
}

export interface EvidenceSourceRef {
  file_id: string;
  page: number;
  highlight_text: string;
}

export interface DraftObservation {
  id: string;
  observation_text: string;
  cfr_citation: string;
  matched_citation?: string;
  citation_title?: string;
  citation_match_score?: number;
  /** eCFR-style labels when the citation matches Title 21 reference data (≥0.95). */
  citation_volume_label?: string;
  citation_part_label?: string;
  citation_chapter_label?: string;
  citation_subchapter_label?: string;
  evidence_list: string[];
  /** Model confidence; API may return 0–1 or 0–100 depending on path — normalize in UI when displaying %. */
  confidence_score: number;
  /** Pipeline confidence (weighted mapping / evidence / structure / CFR); same scale as confidence_score on generate path. */
  confidence?: number;
  pipeline_status?: "pass" | "warning" | "failed";
  /** green | yellow | red — mirrors pipeline_status for UI. */
  pipeline_status_color?: "green" | "yellow" | "red";
  failure_reason?: string | null;
  source_notes_excerpt: string;
  review_flags: string[];
  validation?: ObservationValidationLayer;
  evidence_sources?: EvidenceSourceRef[];
  cfr_reference?: string;
  /** Weighted components returned by generate-observations (optional). */
  confidence_breakdown?: Record<string, unknown> | null;
}

/** Per-observation metrics (one entry per draft observation). */
export interface ObservationEvalScores {
  observation_index: number;
  structure: boolean;
  cfr_valid: boolean;
  /** When false, CFR subscore was excluded from this row's overall mean. */
  cfr_metric_applicable?: boolean;
  grounded: boolean;
  /** Share of evidence bullets verifiable in source (anti-hallucination). */
  evidence_precision?: number;
  /** 1 if at least one evidence string appears in source notes. */
  grounding_recall?: number;
  /** Harmonic mean of evidence precision and grounding recall. */
  grounding_f1?: number;
  /** Share of narrative tokens (4+ chars) found in source. */
  narrative_grounding_ratio?: number;
  evidence_tp?: number;
  evidence_fp?: number;
  ocr_accuracy: number | null;
  overall: number;
  confidence?: number;
  confidence_breakdown?: Record<string, unknown>;
  pipeline_status?: string;
  pipeline_status_color?: string;
  failure_reason?: string | null;
}

/** Run-level pass / warning / failed counts (JSON uses key `pass`). */
export interface PipelineStatusSummary {
  pass: number;
  warning: number;
  failed: number;
}

/** Run-level compact metrics (API `metrics` on generate-observations). */
export interface GenerateObservationsRunMetrics {
  true_positive_rate: number;
  evidence_score: number | null;
  cfr_valid: boolean | null;
  summary: PipelineStatusSummary;
  avg_confidence?: number | null;
  avg_grounding_f1?: number | null;
  avg_cfr_score?: number | null;
  avg_retrieval_score?: number | null;
}

/** Scores returned with POST /api/ai/generate-observations (and stored per doc_id). */
export interface EvaluationScores {
  /** When present, one score block per generated observation. */
  observations?: ObservationEvalScores[];
  observation_count?: number;
  /** Run-level: mean overall; all-* for structure/CFR/grounding when applicable. */
  structure: boolean;
  /** Null when no CFR parts were supplied — aggregate CFR score is not applied. */
  cfr_valid: boolean | null;
  /** False when request had no cfr_parts; per-observation CFR subscores excluded from overall mean. */
  cfr_metric_applicable?: boolean;
  /** Heuristic: period-count vs segment count (see segmentation_warning). */
  segmentation_valid?: boolean;
  segmentation_warning?: boolean;
  segmentation_note?: string | null;
  summary?: PipelineStatusSummary;
  pipeline_integrity?: boolean;
  grounded: boolean;
  ocr_accuracy: number | null;
  overall: number;
  /** Micro averages over this run (all observations). */
  grounding_precision_micro?: number;
  grounding_recall_micro?: number;
  grounding_f1_micro?: number;
  narrative_grounding_avg?: number;
  evidence_tp_total?: number;
  evidence_fp_total?: number;
  /** When set, compares drafted observation count to pre-draft estimate from OCR/raw notes. */
  expected_observation_count?: number | null;
  count_match?: boolean | null;
  metrics?: GenerateObservationsRunMetrics;
}

export interface GenerateObservationsResponse {
  status?: string;
  /** UTC instant when the run completed (ISO 8601 with Z), from API. */
  run_timestamp?: string | null;
  observations: DraftObservation[];
  knowledge_base_refs: string[];
  citation_refs?: {
    citation: string;
    section_title: string;
    section_label: string;
    score: number;
  }[];
  doc_id?: string | null;
  /** Supabase `pipeline_runs.id` when FastAPI persisted the full AI trace for this call. */
  pipeline_run_id?: string | null;
  evaluation?: EvaluationScores | null;
  expected_observation_count?: number | null;
  drafted_observation_count?: number | null;
  count_matches_expectation?: boolean | null;
  observation_count_rationale?: string | null;
  /** Distinct issues after segmentation (before drafting). */
  segmented_count?: number | null;
  /** Same as drafted_observation_count; explicit for dashboards. */
  drafted_count?: number | null;
  /** True when segmented_count === drafted_count (1:1 pipeline). */
  mapping_valid?: boolean | null;
  /** Heuristic: likely enough distinct segments vs. '.'-based proxy (see evaluation.segmentation_warning). */
  segmentation_valid?: boolean | null;
  /** True when segmentation_valid is false — mapping counts alone can look fine while merge risk exists. */
  segmentation_warning?: boolean | null;
  /** Plain-language explanation when segmentation_warning is true. */
  segmentation_note?: string | null;
  /** Same distribution as metrics.summary — headline pass/warning/failed counts. */
  summary?: PipelineStatusSummary | null;
  pipeline_integrity?: boolean | null;
  metrics?: GenerateObservationsRunMetrics | null;
}

/** GET /api/evaluation/{inspection_id} */
export interface InspectionEvaluationDashboard {
  ocr_accuracy: number;
  cfr_match_score: number;
  evidence_coverage: number;
  hallucination_flags: string[];
  template_score: number;
  overall_score: number;
  inspection_id: string;
  per_document: Array<{
    document_id: string;
    created_at?: string | null;
    ocr_accuracy: number;
    cfr_match_score: number;
    evidence_coverage: number;
    hallucination_flags: string[];
    hallucination_safety_score?: number;
    template_score: number;
    overall_score: number;
    explanations?: Record<string, string>;
  }>;
  explanations?: Record<string, string>;
}

/** GET /api/eval/metrics */
export interface AggregateEvalMetrics {
  structure_rate: number;
  cfr_accuracy: number;
  grounding_rate: number;
  ocr_avg: number;
  overall_score: number;
  /** Total draft observations represented in the aggregates (per-observation rollups). */
  observation_count?: number;
  evidence_precision_avg?: number;
  grounding_recall_avg?: number;
  grounding_f1_avg?: number;
  narrative_grounding_avg?: number;
  grounding_f1_micro_run_avg?: number;
}

/** GET /api/eval/documents/:id */
export interface EvaluationDocumentResponse {
  draft: {
    observations: DraftObservation[];
    knowledge_base_refs?: string[];
    citation_refs?: unknown[];
  } | null;
  evaluation: EvaluationScores | null;
  input: string;
  doc_id?: string;
  created_at?: string;
  inspection_id?: string | null;
  inspection_title?: string | null;
}

/** GET /api/eval/documents?title=… */
export interface EvaluationSummary {
  doc_id: string;
  inspection_title: string | null;
  inspection_id: string | null;
  created_at: string | null;
  overall: number;
}

export interface EIRNarrative {
  cover_info: string;
  purpose_scope: string;
  regulatory_framework: string;
  background_scope: string;
  inspection_methodology: string;
  observations_summary: string;
  evidence_descriptions: string;
  chronological_account: string;
  references_and_citations: string;
}

/** POST /api/ai/generate-eir-pipeline — extends narrative with traceability + coverage metrics */
export interface EIRPipelineNarrative extends EIRNarrative {
  traceability?: {
    observation_index: number;
    observation_id: string;
    cfr_citation: string;
    evidence_sources: string[];
    compliance_discussion: string;
  }[];
  coverage?: number | null;
  observation_coverage_valid?: boolean | null;
  missing_observation_ids?: string[];
  eir_total_observations?: number | null;
  eir_observations_included?: number | null;
  eir_coverage_recovered?: boolean | null;
  eir_llm_missing_observation_ids?: string[];
}

export interface ValidationResult {
  is_valid: boolean;
  issues: string[];
  suggestions: string[];
}

export interface OCRResult {
  text_blocks: { text: string; confidence: number }[];
  full_text: string;
  low_confidence_blocks: { text: string; confidence: number }[];
}

export interface ExtractMetadataResponse {
  metadata: InspectionMetadata;
}

export interface ObservationStats {
  total: number;
  by_establishment_type: Record<string, number>;
  by_cfr_part: Record<string, number>;
  top_citations: { citation: string; count: number }[];
  column_names?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface DocumentLibraryItem {
  id: number;
  firm_name: string;
  fei_number: string;
  inspection_start?: string;
  observation_count: number;
  document_type: string;
  status: string;
  created_at: string;
}

export interface TopRegulationItem {
  citation: string;
  count: number;
}

export interface WorkflowNotification {
  id: string;
  user_id: string;
  inspection_id: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface InspectionComment {
  id: string;
  inspection_id: string;
  author_id: string;
  author_role: string;
  author_name?: string;
  comment: string;
  created_at: string;
}

export interface InspectionVersion {
  id: string;
  inspection_id: string;
  version_number: number;
  created_by: string;
  version_type: "DRAFT" | "SUBMITTED" | "REWORK" | "APPROVED";
  comments_snapshot: string;
  payload_json: string;
  created_at: string;
  creator_name?: string;
}

export interface ApprovedDocumentRecord {
  id: string;
  inspection_id: string | null;
  title: string;
  status: string;
  approved_at: string;
  investigator_id: string | null;
  supervisor_id: string | null;
  publish_ready: boolean;
  archived_year: number | null;
  reopened_from_document_id: string | null;
  final_metadata_json: string;
  final_observations_json: string;
  final_eir_json: string;
  signatures_json: string;
  comments_snapshot_json: string;
  investigator_name?: string;
  supervisor_name?: string;
}

/** GET /api/evaluation/pipeline/dashboard/summary */
export interface PipelineDashboardSummary {
  total_runs: number;
  total_observations: number;
  avg_confidence: number | null;
  avg_grounding_f1: number | null;
  avg_cfr_score: number | null;
  avg_retrieval_score: number | null;
}

export interface PipelineRunListItem {
  id: string;
  run_type: string;
  inspection_id: string | null;
  status: string;
  created_at: string | null;
  completed_at: string | null;
  observation_count: number | null;
  avg_confidence: number | null;
  doc_id: string | null;
}

export interface PipelineRunListResponse {
  total: number;
  limit: number;
  offset: number;
  items: PipelineRunListItem[];
}

export interface PipelineRunDetailResponse {
  run: Record<string, unknown>;
  observations: Record<string, unknown>[];
  chunks: Record<string, unknown>[];
  cfr_matches: Record<string, unknown>[];
  events: Record<string, unknown>[];
}

export interface ObservationExplainabilityResponse {
  pipeline_run_id: string;
  observation_index: number;
  observation_text: string;
  evidence_used: string[];
  matched_cfr: string | null;
  cfr_score: number | null;
  cfr_candidates: Record<string, unknown>[];
  retrieved_chunks: Record<string, unknown>[];
  grounding_mode: string | null;
  grounding: Record<string, unknown>;
  confidence: number | null;
  confidence_breakdown: Record<string, unknown> | null;
  payload: Record<string, unknown>;
  evaluation: Record<string, unknown>;
}
