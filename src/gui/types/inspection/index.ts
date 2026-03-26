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

export interface DraftObservation {
  id: string;
  observation_text: string;
  cfr_citation: string;
  matched_citation?: string;
  citation_title?: string;
  citation_match_score?: number;
  evidence_list: string[];
  confidence_score: number;
  source_notes_excerpt: string;
  review_flags: string[];
}

export interface GenerateObservationsResponse {
  observations: DraftObservation[];
  knowledge_base_refs: string[];
  citation_refs?: {
    citation: string;
    section_title: string;
    section_label: string;
    score: number;
  }[];
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
