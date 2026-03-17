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
  background_scope: string;
  observations_summary: string;
  evidence_descriptions: string;
  chronological_account: string;
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
