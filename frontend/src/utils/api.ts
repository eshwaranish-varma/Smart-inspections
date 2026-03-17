import axios from 'axios';
import type { InspectionMetadata, DraftObservation, GenerateObservationsResponse, EIRNarrative, ValidationResult, OCRResult, ObservationStats, PaginatedResponse, DocumentLibraryItem, TopRegulationItem, ExtractMetadataResponse } from '@/types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err.response?.data?.detail ??
      err.response?.data?.error ??
      err.message ??
      'Request failed';
    console.error('API Error:', msg);
    return Promise.reject(err);
  }
);

export const getObservations = (params: { q?: string; page?: number; per_page?: number; establishment_type?: string }) =>
  api.get<PaginatedResponse<Record<string, string>>>('/observations', { params }).then(r => r.data);

export const getObservationStats = () =>
  api.get<ObservationStats>('/observations/stats').then(r => r.data);

export const searchObservations = (q: string) =>
  api.get<Record<string, string>[]>('/observations/search', { params: { q } }).then(r => r.data);

export const addObservation = (data: Record<string, string>) =>
  api.post('/observations', data).then(r => r.data);

export const exportObservations = (q: string = '') =>
  api.get('/observations/export', { params: { q }, responseType: 'blob' }).then(r => {
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url; a.download = 'observations_export.xlsx'; a.click();
    URL.revokeObjectURL(url);
  });

export const generateObservations = (data: { raw_notes: string; establishment_type: string; cfr_parts: string[]; additional_context?: Record<string, unknown> }) =>
  api.post<GenerateObservationsResponse>('/ai/generate-observations', data).then(r => r.data);

export const generateEIR = (data: { observations: DraftObservation[]; inspection_metadata: InspectionMetadata; raw_notes?: string }) =>
  api.post<EIRNarrative>('/ai/generate-eir', data).then(r => r.data);

export const refineObservation = (data: { observation: DraftObservation; user_feedback: string }) =>
  api.post<DraftObservation>('/ai/refine-observation', data).then(r => r.data);

export const validateObservation = (obs: DraftObservation) =>
  api.post<ValidationResult>('/ai/validate-observation', obs).then(r => r.data);

export const processOCR = (file: File, isHandwritten: boolean = false) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('is_handwritten', String(isHandwritten));
  return api.post<OCRResult>('/ocr', fd).then(r => r.data);
};

export const extractInspectionMetadata = (data: { raw_text: string }) =>
  api.post<ExtractMetadataResponse>('/ai/extract-metadata', data).then(r => r.data);

export const downloadDocument = (type: '483' | 'eir' | 'both', data: { form_data: InspectionMetadata; observations: DraftObservation[] }) => {
  const endpoint = type === '483' ? '/documents/generate-483' : type === 'eir' ? '/documents/generate-eir' : '/documents/generate-both';
  const name = type === 'both' ? 'FDA_Documents.zip' : type === '483' ? 'FDA_483.docx' : 'EIR_Narrative.docx';
  return api.post(endpoint, data, { responseType: 'blob' }).then(r => {
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  });
};

export const getLibrary = () =>
  api.get<DocumentLibraryItem[]>('/library').then(r => r.data);

export const saveToLibrary = (data: Record<string, unknown>) =>
  api.post('/library', data).then(r => r.data);

export const getLibraryItem = (id: number) =>
  api.get(`/library/${id}`).then(r => r.data);

export const deleteLibraryItem = (id: number) =>
  api.delete(`/library/${id}`).then(r => r.data);

export const getHealth = () =>
  api.get('/health').then(r => r.data);

export const getTopRegulations = (limit: number = 10) =>
  api.get<{ items: TopRegulationItem[] }>('/references/top-regulations', { params: { limit } }).then(r => r.data.items);

export default api;
