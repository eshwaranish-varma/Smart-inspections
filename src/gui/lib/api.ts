import { apiFetch, apiFetchBlob } from '@/lib/apiClient';
import type {
  InspectionMetadata,
  DraftObservation,
  GenerateObservationsResponse,
  EIRNarrative,
  EIRPipelineNarrative,
  ValidationResult,
  OCRResult,
  ObservationStats,
  PaginatedResponse,
  DocumentLibraryItem,
  TopRegulationItem,
  ExtractMetadataResponse,
  AggregateEvalMetrics,
  EvaluationDocumentResponse,
  EvaluationSummary,
  InspectionEvaluationDashboard,
  ObservationExplainabilityResponse,
  PipelineDashboardSummary,
  PipelineRunDetailResponse,
  PipelineRunListResponse,
} from '@/types/inspection';

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || '';
const BASE = configuredBaseUrl
  ? configuredBaseUrl.replace(/\/$/, '').endsWith('/api')
    ? configuredBaseUrl.replace(/\/$/, '')
    : `${configuredBaseUrl.replace(/\/$/, '')}/api`
  : '/api';

function qs(params: Record<string, string | number | undefined | null>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export const getObservations = (params: { q?: string; page?: number; per_page?: number; establishment_type?: string }) =>
  apiFetch<PaginatedResponse<Record<string, string>>>(`${BASE}/observations${qs(params)}`);

export const getObservationStats = () =>
  apiFetch<ObservationStats>(`${BASE}/observations/stats`);

export const searchObservations = (q: string) =>
  apiFetch<Record<string, string>[]>(`${BASE}/observations/search${qs({ q })}`);

export const addObservation = (data: Record<string, string>) =>
  apiFetch(`${BASE}/observations`, { method: 'POST', body: JSON.stringify(data) });

export const exportObservations = async (q: string = '') => {
  const blob = await apiFetchBlob(`${BASE}/observations/export${qs({ q })}`);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'observations_export.xlsx'; a.click();
  URL.revokeObjectURL(url);
};

export const generateObservations = (data: {
  raw_notes: string;
  establishment_type: string;
  cfr_parts: string[];
  additional_context?: Record<string, unknown>;
  ground_truth?: string | null;
  inspection_id?: string | null;
  inspection_title?: string | null;
  skip_observation_count_estimate?: boolean;
  refinement_feedback?: string | null;
}) =>
  apiFetch<GenerateObservationsResponse>(`${BASE}/ai/generate-observations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getEvalMetrics = () =>
  apiFetch<AggregateEvalMetrics>(`${BASE}/eval/metrics`);

export const getEvalDocument = (docId: string) =>
  apiFetch<EvaluationDocumentResponse>(`${BASE}/eval/documents/${encodeURIComponent(docId)}`);

export const listEvalDocuments = (params?: { title?: string; inspection_id?: string; limit?: number }) => {
  const p: Record<string, string | number | undefined> = { limit: params?.limit ?? 100 };
  if (params?.title?.trim()) p.title = params.title.trim();
  if (params?.inspection_id?.trim()) p.inspection_id = params.inspection_id.trim();
  return apiFetch<EvaluationSummary[]>(`${BASE}/eval/documents${qs(p)}`);
};

export const getInspectionEvaluationDashboard = (inspectionId: string) =>
  apiFetch<InspectionEvaluationDashboard>(`${BASE}/evaluation/${encodeURIComponent(inspectionId)}`);

export const getPipelineDashboardSummary = () =>
  apiFetch<PipelineDashboardSummary>(`${BASE}/evaluation/pipeline/dashboard/summary`);

export const listPipelineRuns = (params?: { limit?: number; offset?: number; run_type?: string }) =>
  apiFetch<PipelineRunListResponse>(`${BASE}/evaluation/pipeline/runs${qs(params ?? {})}`);

export const getPipelineRunDetail = (runId: string) =>
  apiFetch<PipelineRunDetailResponse>(`${BASE}/evaluation/pipeline/runs/${encodeURIComponent(runId)}`);

export const getPipelineObservationExplain = (runId: string, observationIndex: number) =>
  apiFetch<ObservationExplainabilityResponse>(
    `${BASE}/evaluation/pipeline/runs/${encodeURIComponent(runId)}/observations/${observationIndex}`,
  );

export const generateEIR = (data: { observations: DraftObservation[]; inspection_metadata: InspectionMetadata; raw_notes?: string }) =>
  apiFetch<EIRNarrative>(`${BASE}/ai/generate-eir`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const refineObservation = (data: { observation: DraftObservation; user_feedback: string }) =>
  apiFetch<DraftObservation>(`${BASE}/ai/refine-observation`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const validateObservation = (obs: DraftObservation) =>
  apiFetch<ValidationResult>(`${BASE}/ai/validate-observation`, {
    method: 'POST',
    body: JSON.stringify(obs),
  });

export const processOCR = (file: File, isHandwritten: boolean = false) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('is_handwritten', String(isHandwritten));
  return apiFetch<OCRResult>(`${BASE}/ocr`, {
    method: 'POST',
    body: fd,
    headers: {},
  });
};

export const extractInspectionMetadata = (data: { raw_text: string }) =>
  apiFetch<ExtractMetadataResponse>(`${BASE}/ai/extract-metadata`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const downloadDocument = async (
  type: '483' | 'eir' | 'both',
  data: {
    form_data: InspectionMetadata;
    observations: DraftObservation[];
    raw_notes?: string;
    eir_narrative?: EIRNarrative | EIRPipelineNarrative;
  },
) => {
  const endpoint = type === '483' ? '/documents/generate-483' : type === 'eir' ? '/documents/generate-eir' : '/documents/generate-both';
  const name = type === 'both' ? 'FDA_Documents.zip' : type === '483' ? 'FDA_483.docx' : 'EIR_Narrative.docx';
  const blob = await apiFetchBlob(`${BASE}${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
};

export const getLibrary = () =>
  apiFetch<DocumentLibraryItem[]>(`${BASE}/library`);

export type LibraryDocumentDetail = {
  id: number;
  firm_name: string;
  fei_number: string;
  observation_count: number;
  observations: DraftObservation[];
  metadata: InspectionMetadata;
  document_type: string;
  status: string;
  status_display?: string;
  inspection_id?: string | null;
  created_at: string;
};

export const saveToLibrary = (data: Record<string, unknown>) =>
  apiFetch(`${BASE}/library`, { method: 'POST', body: JSON.stringify(data) });

export const getLibraryItem = (id: number) =>
  apiFetch<LibraryDocumentDetail>(`${BASE}/library/${id}`);

export const deleteLibraryItem = (id: number) =>
  apiFetch(`${BASE}/library/${id}`, { method: 'DELETE' });

export type HealthResponse = {
  status?: string;
  kb_loaded?: boolean;
};

export const getHealth = () => apiFetch<HealthResponse>(`${BASE}/health`);

export const getTopRegulations = (limit: number = 10) =>
  apiFetch<{ items: TopRegulationItem[] }>(`${BASE}/references/top-regulations${qs({ limit })}`).then(r => r.items);

export const createInspection = async <T>(inspection: T) => inspection;
