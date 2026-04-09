"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  Sparkles,
  Download,
  Save,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  ClipboardList,
  Type,
  ListChecks,
  FileCheck,
} from 'lucide-react';
import { PIPELINE_RUN_STORAGE_KEY } from '@/components/evaluation/PipelineRunDashboard';
import type {
  InspectionMetadata,
  DraftObservation,
  GenerateObservationsResponse,
  OCRResult,
} from '@/types/inspection';
import {
  generateObservations,
  generateEIR,
  downloadDocument,
  saveToLibrary,
  processOCR,
  extractInspectionMetadata,
  addObservation,
} from '@/lib/api';
import Form483Preview from '@/components/inspection-components/inspection/Form483Preview';
import EIRPreview from '@/components/inspection-components/inspection/EIRPreview';
import { are483ObservationsLockedFromStatus } from '@/lib/inspection-workflow-policy';

const ESTABLISHMENT_TYPES = [
  'Pharmaceutical Manufacturer',
  'Food Facility',
  'Medical Device',
  'Cosmetics',
  'Veterinary',
  'Dietary Supplement',
  'Other',
];

const FDA_DISTRICTS = [
  'Atlanta District', 'Baltimore District', 'Central Atlantic District',
  'Chicago District', 'Cincinnati District', 'Dallas District',
  'Denver District', 'Detroit District', 'Florida District',
  'Kansas City District', 'Los Angeles District', 'Minneapolis District',
  'New England District', 'New Jersey District', 'New Orleans District',
  'New York District', 'Philadelphia District', 'San Francisco District',
  'San Juan District', 'Seattle District',
];

const CFR_PARTS = [
  { label: '21 CFR Part 110 — cGMP Food', value: '110' },
  { label: '21 CFR Part 210 — cGMP Drugs (General)', value: '210' },
  { label: '21 CFR Part 211 — cGMP Drugs (Finished)', value: '211' },
  { label: '21 CFR Part 820 — QSR Medical Devices', value: '820' },
  { label: '21 CFR Part 111 — cGMP Dietary Supplements', value: '111' },
  { label: '21 CFR Part 117 — Preventive Controls', value: '117' },
  { label: '21 CFR Part 4 — Combination Products', value: '4' },
];

const STEPS = ['Inspection Metadata', 'Input Notes', 'AI Generation', 'Review & Generate'];

const INPUT_CLASS =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none';

const TEXTAREA_CLASS =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none resize-y';

const SELECT_CLASS =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none';

interface UploadedFile {
  file: File;
  ocrResult?: OCRResult;
  ocrText?: string;
  processing: boolean;
}

interface ChecklistEntry {
  area: string;
  condition: string;
  evidence: string;
  cfrPart: string;
}

function confidenceColor(score: number) {
  if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
  if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

function confidenceDot(score: number) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fileTypeBadge(type: string) {
  if (type.includes('pdf')) return { label: 'PDF', cls: 'bg-red-100 text-red-700' };
  if (type.includes('image')) return { label: 'Image', cls: 'bg-blue-100 text-blue-700' };
  if (type.includes('word') || type.includes('document')) return { label: 'DOCX', cls: 'bg-indigo-100 text-indigo-700' };
  return { label: 'File', cls: 'bg-gray-100 text-gray-700' };
}

function normalizeDateForInput(value: string): string {
  const raw = value.trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const mmddyyyy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (mmddyyyy) {
    const mm = mmddyyyy[1].padStart(2, '0');
    const dd = mmddyyyy[2].padStart(2, '0');
    const yyyy = mmddyyyy[3].length === 2 ? `20${mmddyyyy[3]}` : mmddyyyy[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return '';
}

export type NewInspectionProps = {
  forcedInspectionId?: string | null;
  /** Workflow route: 483 drafting vs EIR drafting (483 observations read-only). */
  initialPhase?: '483' | 'eir';
};

export default function NewInspection({
  forcedInspectionId = null,
  initialPhase = '483',
}: NewInspectionProps = {}) {
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workflowInspectionId = forcedInspectionId ?? searchParams.get('inspectionId');
  const draftPhase: '483' | 'eir' =
    initialPhase === 'eir' || searchParams.get('phase') === 'eir' ? 'eir' : '483';
  const isEirOnlyWorkspace = Boolean(workflowInspectionId && draftPhase === 'eir');
  const [step, setStep] = useState(0);

  const [metadata, setMetadata] = useState<InspectionMetadata>({
    firm_name: '',
    fei_number: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'United States',
    establishment_type: '',
    inspection_start: '',
    inspection_end: '',
    district_office: '',
    investigators: [{ name: '', title: '' }],
    report_issued_to_name: '',
    report_issued_to_title: '',
  });

  const [notesTab, setNotesTab] = useState<'upload' | 'type' | 'checklist'>('upload');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [typedNotes, setTypedNotes] = useState('');
  const [checklist, setChecklist] = useState<ChecklistEntry[]>([
    { area: '', condition: '', evidence: '', cfrPart: '' },
  ]);
  const [selectedCFR, setSelectedCFR] = useState<string[]>([]);

  const [observations, setObservations] = useState<DraftObservation[]>([]);
  const [generating, setGenerating] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

  const [docType, setDocType] = useState<'483' | 'eir' | 'both'>('both');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [metadataSourceFile, setMetadataSourceFile] = useState<File | null>(null);
  const [metadataAutofilling, setMetadataAutofilling] = useState(false);

  const [eirNarrative, setEirNarrative] = useState<Record<string, string>>({});
  const [eirPreviewLoading, setEirPreviewLoading] = useState(false);
  const [docReviewTab, setDocReviewTab] = useState<'483' | 'eir'>('483');
  const [docReviewZoom, setDocReviewZoom] = useState(1);
  const [inspectionWorkflowStatus, setInspectionWorkflowStatus] = useState<string | null>(null);
  const [workflowFdaPipeline, setWorkflowFdaPipeline] = useState(false);
  const [workflowFdaSequenced, setWorkflowFdaSequenced] = useState(false);
  const [pipelineEirLoading, setPipelineEirLoading] = useState(false);
  /** eNSpect workflow assignment title — sent with AI generation for evaluation lookup. */
  const [workflowInspectionTitle, setWorkflowInspectionTitle] = useState('');

  const obs483ReadOnly =
    are483ObservationsLockedFromStatus(inspectionWorkflowStatus) || draftPhase === 'eir';

  /** FDA sequenced inspections: hide EIR preview/exports until workflow reaches EIR drafting (or later). Legacy inspections (no flag) keep combined 483+EIR preview at draft complete. */
  const EIR_PREVIEW_ALLOWED = [
    'eir_drafting',
    'eir_submitted',
    'under_review',
    'rework_required',
    'eir_approved',
    'approved',
    'closed',
  ];
  const blockEirUntilEirDrafting = Boolean(
    workflowInspectionId &&
      workflowFdaSequenced &&
      inspectionWorkflowStatus &&
      !EIR_PREVIEW_ALLOWED.includes(inspectionWorkflowStatus),
  );

  useEffect(() => {
    if (!isEirOnlyWorkspace) return;
    setStep(3);
    setDocReviewTab('eir');
    setDocType('eir');
  }, [isEirOnlyWorkspace]);

  const collectAllNotes = useCallback((): string => {
    const parts: string[] = [];
    if (typedNotes.trim()) parts.push(typedNotes.trim());
    uploadedFiles.forEach(f => {
      if (f.ocrText?.trim()) parts.push(f.ocrText.trim());
    });
    checklist.forEach(c => {
      if (c.condition.trim()) {
        parts.push(`[${c.area}] ${c.condition} | Evidence: ${c.evidence} | CFR: ${c.cfrPart}`);
      }
    });
    return parts.join('\n\n');
  }, [typedNotes, uploadedFiles, checklist]);

  const step3EirFetched = useRef(false);
  useEffect(() => {
    if (step < 3) step3EirFetched.current = false;
  }, [step]);

  useEffect(() => {
    if (!workflowInspectionId) setWorkflowInspectionTitle('');
  }, [workflowInspectionId]);

  useEffect(() => {
    if (!workflowInspectionId) return;
    let active = true;

    const loadInspection = async () => {
      try {
        const response = await fetch(`/api/inspections/${workflowInspectionId}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!active || !data.inspection) return;
        const loaded = data.inspection;
        setWorkflowInspectionTitle(typeof loaded.title === 'string' ? loaded.title : '');
        const parsedMetadata = (() => {
          try {
            return JSON.parse(loaded.metadata_json || '{}');
          } catch {
            return {};
          }
        })();
        const parsedObservations = (() => {
          try {
            return JSON.parse(loaded.observations_json || '[]');
          } catch {
            return [];
          }
        })();
        const st = loaded.status || '';
        setInspectionWorkflowStatus(st || null);
        setWorkflowFdaPipeline(Boolean(parsedMetadata.fda_pipeline));
        const fdaSeq = Boolean(parsedMetadata.fda_sequenced_workflow);
        setWorkflowFdaSequenced(fdaSeq);
        const allowEirPreviewContent =
          !fdaSeq || EIR_PREVIEW_ALLOWED.includes(st);
        const parsedEir = (() => {
          try {
            return JSON.parse(loaded.eir_json || '{}') as Record<string, unknown>;
          } catch {
            return {};
          }
        })();
        if (allowEirPreviewContent && Object.keys(parsedEir).length > 0) {
          const { traceability: _t, ...rest } = parsedEir;
          setEirNarrative(rest as Record<string, string>);
        } else {
          setEirNarrative({});
        }
        setMetadata((prev) => ({
          ...prev,
          ...parsedMetadata,
          firm_name: parsedMetadata.firm_name || loaded.firm_name || prev.firm_name,
          fei_number: parsedMetadata.fei_number || loaded.fei_number || prev.fei_number,
          establishment_type: parsedMetadata.establishment_type || loaded.establishment_type || prev.establishment_type,
          district_office: parsedMetadata.district_office || loaded.district_office || prev.district_office,
          inspection_start: parsedMetadata.inspection_start || loaded.inspection_start || prev.inspection_start,
          inspection_end: parsedMetadata.inspection_end || loaded.inspection_end || prev.inspection_end,
        }));
        setTypedNotes(loaded.raw_notes || '');
        setObservations(parsedObservations);
        if (parsedObservations.length > 0) {
          if (draftPhase === 'eir') setStep(3);
          else setStep(2);
        }
      } catch (error) {
        console.error('Failed to load workflow inspection draft:', error);
      }
    };

    loadInspection();
    return () => {
      active = false;
    };
  }, [workflowInspectionId, draftPhase]);

  const syncWorkflowDraft = useCallback(async (options?: {
    createVersion?: boolean;
    versionType?: 'DRAFT' | 'SUBMITTED' | 'REWORK' | 'APPROVED';
    versionComments?: string;
    eirJson?: string;
  }) => {
    if (!workflowInspectionId) return;
    const include483Observations =
      !are483ObservationsLockedFromStatus(inspectionWorkflowStatus) && draftPhase !== 'eir';
    const body: Record<string, unknown> = {
      metadata_json: JSON.stringify(metadata),
      raw_notes: collectAllNotes(),
      create_version: options?.createVersion ?? true,
      version_type: options?.versionType || 'DRAFT',
      version_comments: options?.versionComments || 'Draft updated in New Inspection workspace',
    };
    if (include483Observations) {
      body.observations_json = JSON.stringify(observations);
    }
    if (options?.eirJson !== undefined) {
      body.eir_json = options.eirJson;
    }
    await fetch(`/api/inspections/${workflowInspectionId}/data`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
  }, [workflowInspectionId, metadata, observations, collectAllNotes, inspectionWorkflowStatus, draftPhase]);

  const refreshEirPreview = useCallback(async () => {
    if (observations.length === 0 || blockEirUntilEirDrafting) return;
    setEirPreviewLoading(true);
    try {
      const eir = await generateEIR({
        observations,
        inspection_metadata: metadata,
        raw_notes: collectAllNotes(),
      });
      setEirNarrative(eir as unknown as Record<string, string>);
      toast.success('EIR preview updated');
    } catch {
      toast.error('Could not generate EIR preview');
    } finally {
      setEirPreviewLoading(false);
    }
  }, [observations, metadata, collectAllNotes, blockEirUntilEirDrafting]);

  useEffect(() => {
    if (step !== 3 || observations.length === 0 || step3EirFetched.current || blockEirUntilEirDrafting) return;
    step3EirFetched.current = true;
    let cancelled = false;
    setEirPreviewLoading(true);
    generateEIR({
      observations,
      inspection_metadata: metadata,
      raw_notes: collectAllNotes(),
    })
      .then((eir) => {
        if (!cancelled) setEirNarrative(eir as unknown as Record<string, string>);
      })
      .catch(() => {
        if (!cancelled) toast.error('EIR preview could not be loaded. Use Refresh preview.');
      })
      .finally(() => {
        if (!cancelled) setEirPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, observations, metadata, collectAllNotes, blockEirUntilEirDrafting]);

  useEffect(() => {
    if (blockEirUntilEirDrafting) {
      setDocReviewTab('483');
      setDocType('483');
    }
  }, [blockEirUntilEirDrafting]);

  const runPipelineEirGeneration = useCallback(async () => {
    if (!workflowInspectionId) return;
    setPipelineEirLoading(true);
    try {
      const res = await fetch(`/api/inspections/${workflowInspectionId}/generate-eir`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'EIR pipeline generation failed');
        return;
      }
      const eir = data.eir as Record<string, unknown> | undefined;
      if (eir && typeof eir === 'object') {
        const { traceability: _tr, ...rest } = eir;
        setEirNarrative(rest as Record<string, string>);
      }
      toast.success('EIR narrative generated (post–483 pipeline)');
    } finally {
      setPipelineEirLoading(false);
    }
  }, [workflowInspectionId]);

  const updateMeta = useCallback(<K extends keyof InspectionMetadata>(key: K, val: InspectionMetadata[K]) => {
    setMetadata(prev => ({ ...prev, [key]: val }));
  }, []);

  const onDrop = useCallback((accepted: File[]) => {
    setUploadedFiles(prev => [
      ...prev,
      ...accepted.map(file => ({ file, processing: false })),
    ]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.tiff', '.bmp'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
  });

  const handleOCR = async (index: number) => {
    const entry = uploadedFiles[index];
    setUploadedFiles(prev => prev.map((f, i) => i === index ? { ...f, processing: true } : f));
    try {
      const result = await processOCR(entry.file);
      setUploadedFiles(prev =>
        prev.map((f, i) =>
          i === index ? { ...f, processing: false, ocrResult: result, ocrText: result.full_text } : f,
        ),
      );
      toast.success('OCR processing complete');
    } catch {
      setUploadedFiles(prev => prev.map((f, i) => i === index ? { ...f, processing: false } : f));
      toast.error('OCR processing failed');
    }
  };

  const handleMetadataUpload = async () => {
    if (!metadataSourceFile) {
      toast.error('Select a PDF or image first');
      return;
    }
    setMetadataAutofilling(true);
    try {
      const ocr = await processOCR(metadataSourceFile);
      const raw = (ocr.full_text ?? '').trim();
      if (!raw) {
        toast.error(
          'No text could be read from this file. For scanned PDFs, ensure the backend has Tesseract OCR installed.',
        );
        return;
      }
      const extracted = await extractInspectionMetadata({ raw_text: raw });
      const parsed = extracted.metadata;
      setMetadata(prev => {
        const nextInvestigators =
          Array.isArray(parsed.investigators) && parsed.investigators.length > 0
            ? parsed.investigators
                .map(inv => ({
                  name: String(inv?.name ?? '').trim(),
                  title: String(inv?.title ?? '').trim(),
                }))
                .filter(inv => inv.name || inv.title)
            : prev.investigators;
        return {
          ...prev,
          firm_name: parsed.firm_name || prev.firm_name,
          fei_number: String(parsed.fei_number || prev.fei_number).replace(/\D+/g, '').slice(0, 10),
          street_address: parsed.street_address || prev.street_address,
          city: parsed.city || prev.city,
          state: parsed.state || prev.state,
          zip_code: parsed.zip_code || prev.zip_code,
          country: parsed.country || prev.country,
          establishment_type: parsed.establishment_type || prev.establishment_type,
          inspection_start: normalizeDateForInput(parsed.inspection_start) || prev.inspection_start,
          inspection_end: normalizeDateForInput(parsed.inspection_end) || prev.inspection_end,
          district_office: parsed.district_office || prev.district_office,
          investigators: nextInvestigators.length > 0 ? nextInvestigators : prev.investigators,
          report_issued_to_name: parsed.report_issued_to_name || prev.report_issued_to_name,
          report_issued_to_title: parsed.report_issued_to_title || prev.report_issued_to_title,
        };
      });
      toast.success('Metadata auto-filled from uploaded file');
    } catch (e) {
      let message = 'Could not auto-fill metadata from this file';
      if (axios.isAxiosError(e)) {
        const d = e.response?.data?.detail;
        if (typeof d === 'string') message = d;
        else if (d != null) message = JSON.stringify(d);
        else if (e.message) message = e.message;
      }
      toast.error(message);
    } finally {
      setMetadataAutofilling(false);
    }
  };

  const handleGenerate = async () => {
    const raw = collectAllNotes();
    if (!raw) {
      toast.error('Please provide inspection notes before generating');
      return;
    }
    setGenerating(true);
    try {
      let resp: GenerateObservationsResponse;
      if (workflowInspectionId) {
        const genRes = await fetch(`/api/inspections/${workflowInspectionId}/generate-483`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            raw_notes: raw,
            establishment_type: metadata.establishment_type,
            cfr_parts: selectedCFR,
            inspection_title: workflowInspectionTitle.trim() || undefined,
          }),
        });
        if (!genRes.ok) {
          const err = await genRes.json().catch(() => ({}));
          throw new Error(typeof err?.error === 'string' ? err.error : 'Generation failed');
        }
        resp = (await genRes.json()) as GenerateObservationsResponse;
      } else {
        resp = await generateObservations({
          raw_notes: raw,
          establishment_type: metadata.establishment_type,
          cfr_parts: selectedCFR,
          inspection_title: workflowInspectionTitle.trim() || undefined,
        });
      }
      setObservations(resp.observations);
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(PIPELINE_RUN_STORAGE_KEY, JSON.stringify(resp));
        }
      } catch {
        /* ignore quota / private mode */
      }
      if (workflowInspectionId) {
        await fetch(`/api/inspections/${workflowInspectionId}/data`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            metadata_json: JSON.stringify(metadata),
            observations_json: JSON.stringify(resp.observations),
            raw_notes: raw,
            create_version: true,
            version_type: 'DRAFT',
            version_comments: 'AI-generated draft observations updated',
          }),
        });
      }
      toast.success(`Generated ${resp.observations.length} draft observations`, {
        action: {
          label: 'Pipeline dashboard',
          onClick: () => router.push('/evaluation/pipeline'),
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate observations');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateOne = async (idx: number) => {
    const raw = collectAllNotes();
    setGenerating(true);
    try {
      let resp: GenerateObservationsResponse;
      if (workflowInspectionId) {
        const genRes = await fetch(`/api/inspections/${workflowInspectionId}/generate-483`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            raw_notes: raw,
            establishment_type: metadata.establishment_type,
            cfr_parts: selectedCFR,
            inspection_title: workflowInspectionTitle.trim() || undefined,
          }),
        });
        if (!genRes.ok) {
          const err = await genRes.json().catch(() => ({}));
          throw new Error(typeof err?.error === 'string' ? err.error : 'Regeneration failed');
        }
        resp = (await genRes.json()) as GenerateObservationsResponse;
      } else {
        resp = await generateObservations({
          raw_notes: raw,
          establishment_type: metadata.establishment_type,
          cfr_parts: selectedCFR,
          inspection_title: workflowInspectionTitle.trim() || undefined,
        });
      }
      if (resp.observations[idx]) {
        setObservations(prev =>
          prev.map((o, i) => (i === idx ? resp.observations[idx] : o)),
        );
        toast.success('Observation regenerated');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Regeneration failed');
    } finally {
      setGenerating(false);
    }
  };

  const updateObservation = <K extends keyof DraftObservation>(idx: number, key: K, val: DraftObservation[K]) => {
    setObservations(prev => prev.map((o, i) => (i === idx ? { ...o, [key]: val } : o)));
  };

  const deleteObservation = (idx: number) => {
    setObservations(prev => prev.filter((_, i) => i !== idx));
  };

  const addBlankObservation = () => {
    setObservations(prev => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        observation_text: '',
        cfr_citation: '',
        evidence_list: [''],
        confidence_score: 0,
        source_notes_excerpt: '',
        review_flags: [],
      },
    ]);
  };

  const saveToLibraryPayload = (documentType: '483' | 'eir' | 'both') => ({
    firm_name: metadata.firm_name,
    fei_number: metadata.fei_number,
    establishment_type: metadata.establishment_type,
    inspection_start: metadata.inspection_start,
    inspection_end: metadata.inspection_end,
    district_office: metadata.district_office,
    observation_count: observations.length,
    document_type: documentType,
    status: 'draft',
    metadata,
    observations,
  });

  const handleDownload = async (type: '483' | 'eir' | 'both') => {
    if (blockEirUntilEirDrafting && (type === 'eir' || type === 'both')) {
      toast.error('EIR is available after the EIR drafting phase. Use FDA 483 only until then.');
      return;
    }
    setDownloading(type);
    try {
      let eirJson: string | undefined;
      if (type === 'eir' || type === 'both') {
        const eir = await generateEIR({
          observations,
          inspection_metadata: metadata,
          raw_notes: collectAllNotes(),
        });
        setEirNarrative(eir as unknown as Record<string, string>);
        eirJson = JSON.stringify(eir);
      }
      await syncWorkflowDraft({
        createVersion: true,
        versionType: 'DRAFT',
        versionComments: `Prepared ${type.toUpperCase()} export`,
        ...(eirJson !== undefined ? { eirJson } : {}),
      });
      await downloadDocument(type, {
        form_data: metadata,
        observations,
        raw_notes: collectAllNotes(),
      });
      await saveToLibrary(saveToLibraryPayload(type));
      qc.invalidateQueries({ queryKey: ['library'] });
      toast.success('Document downloaded and saved to library');

      if (workflowInspectionId && type === 'both') {
        try {
          const tr = await fetch(`/api/inspections/${workflowInspectionId}/transition`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              transition: 'complete_draft',
              comments: 'Draft FDA 483 and EIR generated from New Inspection',
            }),
          });
          if (!tr.ok) {
            const err = await tr.json().catch(() => ({}));
            toast.info(
              typeof err?.error === 'string'
                ? err.error
                : 'Documents saved. Open the workflow page to mark draft complete if the status did not update.',
            );
          }
        } catch {
          toast.info('Documents saved. You can update workflow status from the inspection page.');
        }
        router.push(`/workflow/${workflowInspectionId}?stay=1`);
      }
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const handleSaveLibrary = async () => {
    try {
      await syncWorkflowDraft({ createVersion: true, versionType: 'DRAFT', versionComments: 'Saved current draft to library' });
      await saveToLibrary(saveToLibraryPayload(docType));
      qc.invalidateQueries({ queryKey: ['library'] });
      toast.success('Saved to library');
    } catch {
      toast.error('Failed to save to library');
    }
  };

  const handleSaveToFY = async () => {
    try {
      for (const obs of observations) {
        await addObservation({
          firm_name: metadata.firm_name,
          fei_number: metadata.fei_number,
          establishment_type: metadata.establishment_type,
          observation_text: obs.observation_text,
          cfr_citation: obs.cfr_citation,
          district_office: metadata.district_office,
        });
      }
      setSaved(true);
      toast.success(`${observations.length} observations saved to Inspection Observations`);
    } catch {
      toast.error('Failed to save observations');
    }
  };

  const validateStep = (s: number): boolean => {
    if (s === 0) {
      if (!metadata.firm_name.trim()) {
        toast.error('Firm Name is required');
        return false;
      }
      if (!metadata.fei_number.trim()) {
        toast.error('FEI Number is required');
        return false;
      }
      if (!/^\d{10}$/.test(metadata.fei_number.trim())) {
        toast.error('FEI Number must be a 10-digit numerical value');
        return false;
      }
      if (!metadata.establishment_type) {
        toast.error('Establishment Type is required');
        return false;
      }
      return true;
    }
    if (s === 1) {
      const raw = collectAllNotes();
      if (!raw) {
        toast.error('Please provide at least some inspection notes');
        return false;
      }
      return true;
    }
    if (s === 2) {
      if (observations.length === 0) {
        toast.error('Generate at least one observation before proceeding');
        return false;
      }
      return true;
    }
    return true;
  };

  const goNext = () => {
    if (validateStep(step)) setStep(s => Math.min(s + 1, 3));
  };
  const goPrev = () => setStep(s => Math.max(s - 1, 0));

  const toggleSource = (id: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-navy-800 mb-1">
          {!workflowInspectionId || pathname?.includes('/new-inspection')
            ? 'New Inspection'
            : 'Inspection drafting workspace'}
        </h1>
        <p className="text-gray-500 mb-8">
          {isEirOnlyWorkspace
            ? 'EIR drafting — Form FDA 483 observations are read-only. Refine narrative and exports from the review workspace.'
            : 'Draft FDA 483 observations and EIR narratives'}
        </p>

        {/* Progress Stepper */}
        {isEirOnlyWorkspace ? (
          <div className="mb-8 rounded-lg border border-navy-200 bg-navy-50/90 px-4 py-3 text-sm text-navy-900">
            <strong>EIR drafting workspace</strong> — 483 observations are locked for editing. Use pipeline tools and EIR
            preview below; return to the assignment for workflow actions.
          </div>
        ) : (
        <div className="mb-10">
          <div className="flex items-center justify-between">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      i < step
                        ? 'bg-green-600 text-white'
                        : i === step
                          ? 'bg-navy-700 text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {i < step ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium whitespace-nowrap ${
                      i <= step ? 'text-navy-700' : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 mt-[-1.25rem] ${
                      i < step ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Step 1: Metadata */}
        {!isEirOnlyWorkspace && step === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-navy-700" />
              Inspection Metadata
            </h2>

            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-900">Auto-fill Company Details</p>
                  <p className="text-xs text-blue-800 mt-1">
                    Upload company details in PDF/JPG/PNG to auto-fill metadata, team members, and report recipient.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-blue-300 bg-white text-sm text-blue-800 hover:bg-blue-100 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Choose File
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.bmp,.tiff"
                    className="hidden"
                    onChange={e => setMetadataSourceFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-xs text-blue-900">
                  {metadataSourceFile ? metadataSourceFile.name : 'No file selected'}
                </span>
                <button
                  type="button"
                  onClick={handleMetadataUpload}
                  disabled={!metadataSourceFile || metadataAutofilling}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-navy-700 text-white hover:bg-navy-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {metadataAutofilling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {metadataAutofilling ? 'Auto-filling…' : 'Auto-fill Metadata'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Firm Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={metadata.firm_name}
                  onChange={e => updateMeta('firm_name', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  FEI Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={metadata.fei_number}
                  onChange={e =>
                    updateMeta('fei_number', e.target.value.replace(/\D+/g, '').slice(0, 10))
                  }
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit FEI number"
                  className={INPUT_CLASS}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter exactly 10 numeric digits.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={metadata.street_address}
                  onChange={e => updateMeta('street_address', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="md:col-span-2 grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={metadata.city}
                    onChange={e => updateMeta('city', e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={metadata.state}
                    onChange={e => updateMeta('state', e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                  <input
                    type="text"
                    value={metadata.zip_code}
                    onChange={e => updateMeta('zip_code', e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={metadata.country}
                  onChange={e => updateMeta('country', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Establishment Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={metadata.establishment_type}
                  onChange={e => updateMeta('establishment_type', e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">Select type…</option>
                  {ESTABLISHMENT_TYPES.map(t => (
                    <option key={t} value={t.toLowerCase().replace(/\s+/g, '_')}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={metadata.inspection_start}
                  onChange={e => updateMeta('inspection_start', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={metadata.inspection_end}
                  onChange={e => updateMeta('inspection_end', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">District Office</label>
                <select
                  value={metadata.district_office}
                  onChange={e => updateMeta('district_office', e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">Select district…</option>
                  {FDA_DISTRICTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Investigators */}
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Investigators / Team Members</h3>
              {metadata.investigators.map((inv, i) => (
                <div key={i} className="flex gap-3 mb-2">
                  <input
                    type="text"
                    placeholder="Name"
                    value={inv.name}
                    onChange={e => {
                      const updated = [...metadata.investigators];
                      updated[i] = { ...updated[i], name: e.target.value };
                      updateMeta('investigators', updated);
                    }}
                    className={INPUT_CLASS}
                  />
                  <input
                    type="text"
                    placeholder="Title"
                    value={inv.title}
                    onChange={e => {
                      const updated = [...metadata.investigators];
                      updated[i] = { ...updated[i], title: e.target.value };
                      updateMeta('investigators', updated);
                    }}
                    className={INPUT_CLASS}
                  />
                  {metadata.investigators.length > 1 && (
                    <button
                      onClick={() =>
                        updateMeta('investigators', metadata.investigators.filter((_, j) => j !== i))
                      }
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() =>
                  updateMeta('investigators', [...metadata.investigators, { name: '', title: '' }])
                }
                className="mt-1 text-sm text-navy-700 hover:text-navy-800 font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add Team Member
              </button>
            </div>

            {/* Report Issued To */}
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Report Issued To</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={metadata.report_issued_to_name}
                    onChange={e => updateMeta('report_issued_to_name', e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={metadata.report_issued_to_title}
                    onChange={e => updateMeta('report_issued_to_title', e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Input Notes */}
        {!isEirOnlyWorkspace && step === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Tabs */}
              <div className="border-b flex">
                {([
                  { key: 'upload' as const, icon: Upload, label: 'Upload Files' },
                  { key: 'type' as const, icon: Type, label: 'Type Notes' },
                  { key: 'checklist' as const, icon: ListChecks, label: 'Structured Checklist' },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setNotesTab(tab.key)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                      notesTab === tab.key
                        ? 'border-navy-700 text-navy-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Upload Tab */}
                {notesTab === 'upload' && (
                  <div>
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                        isDragActive
                          ? 'border-navy-500 bg-navy-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-700">
                        Drop inspection notes, images, or PDFs here
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PDF, images, Word documents, or plain text
                      </p>
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="mt-5 space-y-3">
                        {uploadedFiles.map((uf, i) => {
                          const badge = fileTypeBadge(uf.file.type);
                          return (
                            <div key={i} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <FileText className="w-5 h-5 text-gray-400" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">
                                      {uf.file.name}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {formatFileSize(uf.file.size)}
                                    </p>
                                  </div>
                                  <span
                                    className={`text-xs font-medium px-2 py-0.5 rounded ${badge.cls}`}
                                  >
                                    {badge.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!uf.ocrResult && (
                                    <button
                                      onClick={() => handleOCR(i)}
                                      disabled={uf.processing}
                                      className="px-3 py-1.5 text-xs font-medium rounded-md bg-navy-700 text-white hover:bg-navy-800 disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                      {uf.processing ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Eye className="w-3 h-3" />
                                      )}
                                      Process OCR
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      setUploadedFiles(prev => prev.filter((_, j) => j !== i))
                                    }
                                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {uf.ocrResult && (
                                <div className="mt-4 space-y-3">
                                  <div className="flex flex-wrap gap-2">
                                    {uf.ocrResult.text_blocks.slice(0, 5).map((block, bi) => (
                                      <span
                                        key={bi}
                                        className={`text-xs px-2 py-1 rounded border ${confidenceColor(block.confidence)}`}
                                      >
                                        {block.confidence.toFixed(0)}% confidence
                                      </span>
                                    ))}
                                  </div>
                                  <textarea
                                    value={uf.ocrText ?? ''}
                                    onChange={e =>
                                      setUploadedFiles(prev =>
                                        prev.map((f, j) =>
                                          j === i ? { ...f, ocrText: e.target.value } : f,
                                        ),
                                      )
                                    }
                                    rows={6}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Type Notes Tab */}
                {notesTab === 'type' && (
                  <div>
                    <textarea
                      value={typedNotes}
                      onChange={e => setTypedNotes(e.target.value)}
                      placeholder="Describe conditions observed, evidence collected, records reviewed..."
                      className="w-full min-h-[300px] rounded-md border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none resize-y"
                    />
                    <p className="text-xs text-gray-400 text-right mt-1">
                      {typedNotes.length.toLocaleString()} characters
                    </p>
                  </div>
                )}

                {/* Structured Checklist Tab */}
                {notesTab === 'checklist' && (
                  <div className="space-y-4">
                    {checklist.map((entry, i) => (
                      <div key={i} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Entry {i + 1}
                          </span>
                          {checklist.length > 1 && (
                            <button
                              onClick={() => setChecklist(prev => prev.filter((_, j) => j !== i))}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Area Inspected
                            </label>
                            <input
                              type="text"
                              value={entry.area}
                              onChange={e => {
                                const updated = [...checklist];
                                updated[i] = { ...updated[i], area: e.target.value };
                                setChecklist(updated);
                              }}
                              className={INPUT_CLASS}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Evidence / Records
                            </label>
                            <input
                              type="text"
                              value={entry.evidence}
                              onChange={e => {
                                const updated = [...checklist];
                                updated[i] = { ...updated[i], evidence: e.target.value };
                                setChecklist(updated);
                              }}
                              className={INPUT_CLASS}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Condition Observed
                            </label>
                            <textarea
                              value={entry.condition}
                              onChange={e => {
                                const updated = [...checklist];
                                updated[i] = { ...updated[i], condition: e.target.value };
                                setChecklist(updated);
                              }}
                              rows={2}
                              className={TEXTAREA_CLASS}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Suspected CFR Part
                            </label>
                            <input
                              type="text"
                              value={entry.cfrPart}
                              onChange={e => {
                                const updated = [...checklist];
                                updated[i] = { ...updated[i], cfrPart: e.target.value };
                                setChecklist(updated);
                              }}
                              className={INPUT_CLASS}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        setChecklist(prev => [
                          ...prev,
                          { area: '', condition: '', evidence: '', cfrPart: '' },
                        ])
                      }
                      className="text-sm text-navy-700 hover:text-navy-800 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add Entry
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* CFR Parts */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">
                Applicable CFR Parts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {CFR_PARTS.map(cfr => (
                  <label key={cfr.value} className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedCFR.includes(cfr.value)}
                      onChange={e => {
                        setSelectedCFR(prev =>
                          e.target.checked
                            ? [...prev, cfr.value]
                            : prev.filter(v => v !== cfr.value),
                        );
                      }}
                      disabled={obs483ReadOnly}
                      className="mt-0.5 rounded border-gray-300 text-navy-700 focus:ring-navy-500 disabled:opacity-50"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      {cfr.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: AI Generation */}
        {!isEirOnlyWorkspace && step === 2 && (
          <div className="space-y-6">
            {obs483ReadOnly && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Form FDA 483 observations are locked after submission or in EIR phase. Request rework from the workflow if
                changes are required.
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={generating || obs483ReadOnly}
                className="px-6 py-3 bg-navy-700 text-white rounded-lg font-medium text-sm hover:bg-navy-800 disabled:opacity-60 flex items-center gap-2 transition-colors"
              >
                {generating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                {generating ? 'Generating…' : 'Generate Draft Observations'}
              </button>
              {observations.length > 0 && (
                <button
                  onClick={handleGenerate}
                  disabled={generating || obs483ReadOnly}
                  className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 disabled:opacity-60 flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate All
                </button>
              )}
            </div>

            {generating && observations.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-10 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-navy-700 mx-auto mb-4" />
                <p className="text-sm font-medium text-gray-700">
                  AI is analyzing your notes against IOM standards…
                </p>
                <p className="text-xs text-gray-400 mt-1">This may take a moment</p>
              </div>
            )}

            {observations.map((obs, idx) => (
              <div key={obs.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                    <h3 className="text-sm font-semibold text-gray-800">
                      Observation {idx + 1}
                    </h3>
                    {obs.confidence_score > 0 && (
                      <span className="flex items-center gap-1.5 text-xs font-medium">
                        <span className={`w-2 h-2 rounded-full ${confidenceDot(obs.confidence_score)}`} />
                        {obs.confidence_score}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRegenerateOne(idx)}
                      disabled={generating || obs483ReadOnly}
                      className="p-1.5 text-gray-400 hover:text-navy-700 transition-colors disabled:opacity-50"
                      title="Regenerate"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteObservation(idx)}
                      disabled={obs483ReadOnly}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Observation Text
                    </label>
                    <textarea
                      value={obs.observation_text}
                      onChange={e => updateObservation(idx, 'observation_text', e.target.value)}
                      rows={4}
                      readOnly={obs483ReadOnly}
                      className={`${TEXTAREA_CLASS} ${obs483ReadOnly ? 'cursor-not-allowed bg-gray-50 text-gray-700' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Title 21 CFR citation (AI draft)
                    </label>
                    <input
                      type="text"
                      value={obs.cfr_citation}
                      onChange={e => updateObservation(idx, 'cfr_citation', e.target.value)}
                      readOnly={obs483ReadOnly}
                      className={`${INPUT_CLASS} ${obs483ReadOnly ? 'cursor-not-allowed bg-gray-50' : ''}`}
                    />
                    {obs.matched_citation && (
                      <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                          Title 21 reference match (≥95%)
                        </div>
                        <div className="text-sm font-medium text-blue-900">
                          {obs.matched_citation}
                        </div>
                        {obs.citation_title && (
                          <div className="text-xs text-blue-800 mt-0.5">{obs.citation_title}</div>
                        )}
                        {(obs.citation_volume_label ||
                          obs.citation_part_label ||
                          obs.citation_chapter_label ||
                          obs.citation_subchapter_label) && (
                          <div className="text-[11px] text-blue-800/90 mt-1 space-y-0.5">
                            {obs.citation_volume_label ? <div>Volume: {obs.citation_volume_label}</div> : null}
                            {obs.citation_chapter_label ? <div>{obs.citation_chapter_label}</div> : null}
                            {obs.citation_subchapter_label ? <div>{obs.citation_subchapter_label}</div> : null}
                            {obs.citation_part_label ? <div>{obs.citation_part_label}</div> : null}
                          </div>
                        )}
                        {typeof obs.citation_match_score === 'number' && (
                          <div className="text-[11px] text-blue-700 mt-0.5">
                            Match score: {(obs.citation_match_score * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    )}
                    {!obs.matched_citation && obs.cfr_citation?.trim() && (
                      <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                        No Title 21 row matched at the required threshold (≥95%). Correct the citation or add it to the CFR
                        dataset (CSV/XML in <code className="font-mono text-[10px]">data/</code>).
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Evidence
                    </label>
                    {obs.evidence_list.map((ev, ei) => (
                      <div key={ei} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={ev}
                          onChange={e => {
                            const updated = [...obs.evidence_list];
                            updated[ei] = e.target.value;
                            updateObservation(idx, 'evidence_list', updated);
                          }}
                          readOnly={obs483ReadOnly}
                          className={`${INPUT_CLASS} ${obs483ReadOnly ? 'cursor-not-allowed bg-gray-50' : ''}`}
                        />
                        {obs.evidence_list.length > 1 && (
                          <button
                            onClick={() =>
                              updateObservation(
                                idx,
                                'evidence_list',
                                obs.evidence_list.filter((_, j) => j !== ei),
                              )
                            }
                            disabled={obs483ReadOnly}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        updateObservation(idx, 'evidence_list', [...obs.evidence_list, ''])
                      }
                      disabled={obs483ReadOnly}
                      className="text-xs text-navy-700 hover:text-navy-800 font-medium flex items-center gap-1 disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" /> Add Evidence
                    </button>
                  </div>

                  {obs.source_notes_excerpt && (
                    <div>
                      <button
                        onClick={() => toggleSource(obs.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {expandedSources.has(obs.id) ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                        Source Traceability
                      </button>
                      {expandedSources.has(obs.id) && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200 text-sm text-gray-600 italic">
                          {obs.source_notes_excerpt}
                        </div>
                      )}
                    </div>
                  )}

                  {obs.review_flags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {obs.review_flags.map((flag, fi) => (
                        <span
                          key={fi}
                          className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {observations.length > 0 && (
              <button
                onClick={addBlankObservation}
                disabled={obs483ReadOnly}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:border-navy-300 hover:text-navy-700 transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                Add Observation
              </button>
            )}
          </div>
        )}

        {/* Step 4: Review & Generate */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-navy-700" />
                Document Summary
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 block">Firm</span>
                  <span className="font-medium text-gray-900">{metadata.firm_name || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">FEI</span>
                  <span className="font-medium text-gray-900">{metadata.fei_number || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Type</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {metadata.establishment_type?.replace(/_/g, ' ') || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Observations</span>
                  <span className="font-medium text-gray-900">{observations.length}</span>
                </div>
              </div>
            </div>

            {/* Document Review Workspace — matches workflow inspection preview */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Document Review Workspace</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Page-style preview before download.
                    {blockEirUntilEirDrafting
                      ? ' EIR preview and exports open after workflow reaches EIR Drafting (FDA 483 → firm → assign EIR → begin EIR draft).'
                      : ' EIR narrative is generated for review; downloading Both saves it to the inspection and opens workflow.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-lg border border-gray-200 p-1">
                    <button
                      type="button"
                      onClick={() => setDocReviewTab('483')}
                      className={`rounded-md px-3 py-1.5 text-sm ${docReviewTab === '483' ? 'bg-navy-700 text-white' : 'text-gray-600'}`}
                    >
                      FDA 483
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocReviewTab('eir')}
                      disabled={blockEirUntilEirDrafting}
                      title={blockEirUntilEirDrafting ? 'EIR preview opens after EIR drafting phase' : undefined}
                      className={`rounded-md px-3 py-1.5 text-sm ${docReviewTab === 'eir' ? 'bg-navy-700 text-white' : 'text-gray-600'} disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      EIR
                    </button>
                  </div>
                  {workflowInspectionId &&
                    workflowFdaPipeline &&
                    inspectionWorkflowStatus &&
                    ['eir_assigned', 'eir_drafting', 'rework_required'].includes(inspectionWorkflowStatus) && (
                    <button
                      type="button"
                      onClick={() => void runPipelineEirGeneration()}
                      disabled={pipelineEirLoading || observations.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-navy-300 bg-navy-50 px-3 py-1.5 text-sm font-medium text-navy-800 hover:bg-navy-100 disabled:opacity-50"
                    >
                      {pipelineEirLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Generate EIR (pipeline)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDocReviewZoom(z => Math.max(0.75, z - 0.1))}
                    className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocReviewZoom(z => Math.min(1.35, z + 0.1))}
                    className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  {docReviewTab === 'eir' && (
                    <button
                      type="button"
                      onClick={() => void refreshEirPreview()}
                      disabled={eirPreviewLoading || observations.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${eirPreviewLoading ? 'animate-spin' : ''}`} />
                      Refresh EIR preview
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-auto rounded-2xl bg-slate-100 p-4 max-h-[min(70vh,720px)]">
                {eirPreviewLoading && docReviewTab === 'eir' ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-600">
                    <Loader2 className="h-5 w-5 animate-spin" /> Generating EIR preview…
                  </div>
                ) : (
                  <div style={{ transform: `scale(${docReviewZoom})`, transformOrigin: 'top center' }}>
                    {docReviewTab === '483' ? (
                      <Form483Preview metadata={metadata} observations={observations} watermark="DRAFT" />
                    ) : (
                      <EIRPreview metadata={metadata} eir={eirNarrative} observations={observations} />
                    )}
                  </div>
                )}
              </div>
            </div>

            {workflowInspectionId ? (
              <div className="flex flex-col gap-3 rounded-xl border border-navy-200 bg-navy-50/90 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-navy-800/60 dark:bg-navy-950/40">
                <div>
                  <p className="text-sm font-semibold text-navy-900 dark:text-navy-100">Continue in eNSpect workflow</p>
                  <p className="mt-1 text-xs text-navy-800/90 dark:text-navy-200/80">
                    When drafting is ready, open the assignment to mark draft complete, submit for supervisor review, and follow FDA 483 → EIR steps.
                  </p>
                </div>
                <Link
                  href={`/workflow/${workflowInspectionId}?stay=1`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-navy-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-800 dark:bg-cyan-700 dark:hover:bg-cyan-600"
                >
                  Open inspection workflow
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            ) : null}

            {/* Document Type Toggle */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Document Type</h3>
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                {([
                  { key: '483' as const, label: '483 Only' },
                  { key: 'eir' as const, label: 'EIR Only' },
                  { key: 'both' as const, label: 'Both' },
                ] as const).map(opt => {
                  const eirBlocked = blockEirUntilEirDrafting && (opt.key === 'eir' || opt.key === 'both');
                  return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => !eirBlocked && setDocType(opt.key)}
                    disabled={eirBlocked}
                    title={eirBlocked ? 'EIR exports after EIR drafting phase' : undefined}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      docType === opt.key
                        ? 'bg-navy-700 text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    {opt.label}
                  </button>
                  );
                })}
              </div>
            </div>

            {/* Observations List */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">
                Observations ({observations.length})
              </h3>
              <div className="space-y-3">
                {observations.map((obs, idx) => (
                  <div key={obs.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-start gap-3">
                      <span className="flex-none w-7 h-7 rounded-full bg-navy-700 text-white text-xs font-semibold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 leading-relaxed">
                          {obs.observation_text}
                        </p>
                        {obs.cfr_citation && (
                          <p className="text-xs text-navy-600 mt-1 font-medium">
                            {obs.cfr_citation}
                          </p>
                        )}
                        {obs.citation_title && (
                          <p className="text-xs text-gray-600 mt-1">
                            {obs.citation_title}
                          </p>
                        )}
                      </div>
                      {obs.confidence_score > 0 && (
                        <span
                          className={`flex-none text-xs font-medium px-2 py-1 rounded border ${confidenceColor(obs.confidence_score)}`}
                        >
                          {obs.confidence_score}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Actions</h3>
              <div className="flex flex-wrap gap-3">
                {(docType === '483' || docType === 'both') && (
                  <button
                    onClick={() => handleDownload('483')}
                    disabled={downloading !== null}
                    className="px-4 py-2.5 bg-navy-700 text-white rounded-lg text-sm font-medium hover:bg-navy-800 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    {downloading === '483' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download Form FDA 483 (.docx)
                  </button>
                )}
                {(docType === 'eir' || docType === 'both') && (
                  <button
                    onClick={() => handleDownload('eir')}
                    disabled={downloading !== null}
                    className="px-4 py-2.5 bg-navy-700 text-white rounded-lg text-sm font-medium hover:bg-navy-800 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    {downloading === 'eir' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download EIR Narrative (.docx)
                  </button>
                )}
                {docType === 'both' && (
                  <button
                    onClick={() => handleDownload('both')}
                    disabled={downloading !== null}
                    className="px-4 py-2.5 bg-navy-700 text-white rounded-lg text-sm font-medium hover:bg-navy-800 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    {downloading === 'both' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download Both (.zip)
                  </button>
                )}
                <button
                  onClick={handleSaveLibrary}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save to Library
                </button>
                <button
                  onClick={handleSaveToFY}
                  disabled={saved}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {saved ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saved ? 'Saved to Observations' : 'Save to Inspection Observations'}
                </button>
              </div>

              {saved && (
                <div className="mt-5 flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800 font-medium">
                    Documents generated successfully
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pb-8">
          <button
            onClick={goPrev}
            disabled={step === 0 || isEirOnlyWorkspace}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          {!isEirOnlyWorkspace && step < 3 ? (
            <button
              onClick={goNext}
              className="px-5 py-2.5 bg-navy-700 text-white rounded-lg text-sm font-medium hover:bg-navy-800 flex items-center gap-2 transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : workflowInspectionId ? (
            <Link
              href={`/workflow/${workflowInspectionId}?stay=1`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy-700 text-white rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors dark:bg-cyan-700 dark:hover:bg-cyan-600"
            >
              Open inspection workflow
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}


