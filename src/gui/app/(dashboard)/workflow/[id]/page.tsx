'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Loader2,
  MessageSquare,
  PenLine,
  Play,
  RotateCcw,
  SearchCheck,
  Send,
  Users,
  LineChart,
  XCircle,
  ZoomIn,
  ZoomOut,
  Mail,
  UserPlus,
  Sparkles,
} from 'lucide-react';
import Form483Preview from '@/components/inspection/Form483Preview';
import EIRPreview from '@/components/inspection/EIRPreview';
import SignatureCapture from '@/components/workflow/SignatureCapture';
import { downloadDocument } from '@/lib/api';
import { dashboardPublishStatsQueryKey } from '@/lib/dashboard-publish-stats';
import type {
  DraftObservation,
  InspectionComment,
  InspectionMetadata,
  InspectionVersion,
} from '@/types/inspection';

type Inspection = {
  id: string;
  title: string;
  firm_name: string;
  fei_number: string;
  establishment_type: string;
  status: string;
  creator_name: string;
  created_by: string;
  assignee_name: string | null;
  assigned_to: string | null;
  district_office: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  inspection_start: string | null;
  inspection_end: string | null;
  observations_json: string;
  eir_json: string;
  metadata_json: string;
  raw_notes: string;
  created_at: string;
  updated_at: string;
};

type WorkflowLog = {
  id: string;
  action: string;
  performer_name: string;
  comments: string;
  previous_status: string | null;
  new_status: string | null;
  created_at: string;
};

type Profile = { id: string; role: string; first_name?: string; last_name?: string };

type SavedSignature = {
  signature_type?: string | null;
  signature_text?: string | null;
  signature_image?: string | null;
  signed_name?: string | null;
  signature_updated_at?: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  created: { label: 'Created', color: 'text-gray-600', bg: 'bg-gray-100' },
  assigned: { label: 'Assigned', color: 'text-blue-700', bg: 'bg-blue-100' },
  in_progress: { label: 'In Progress', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  draft_completed: { label: 'Draft Completed', color: 'text-amber-700', bg: 'bg-amber-100' },
  approved_483: { label: '483 Approved', color: 'text-teal-800', bg: 'bg-teal-100' },
  sent_to_firm: { label: '483 Sent to Firm', color: 'text-sky-800', bg: 'bg-sky-100' },
  eir_assigned: { label: 'EIR Assigned', color: 'text-cyan-800', bg: 'bg-cyan-100' },
  eir_drafting: { label: 'EIR Drafting', color: 'text-blue-800', bg: 'bg-blue-50' },
  eir_submitted: { label: 'EIR Submitted', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  under_review: { label: 'Under Review', color: 'text-purple-700', bg: 'bg-purple-100' },
  approved: { label: 'Approved', color: 'text-green-700', bg: 'bg-green-100' },
  eir_approved: { label: 'EIR Approved', color: 'text-green-800', bg: 'bg-green-100' },
  rework_required: { label: 'Rework Required', color: 'text-red-700', bg: 'bg-red-100' },
  rejected: { label: 'Rejected', color: 'text-red-800', bg: 'bg-red-200' },
  closed: { label: 'Closed', color: 'text-gray-800', bg: 'bg-gray-200' },
};

const WORKFLOW_STEPS = ['created', 'assigned', 'in_progress', 'draft_completed', 'eir_submitted', 'under_review', 'approved', 'closed'];

/** FDA 483 → EIR sequence (shown when inspection enters post-483 workflow). */
const FDA_PIPELINE_STEPS = [
  '483 Draft',
  '483 Approved',
  'Send to Firm',
  'Assign EIR',
  'EIR Draft',
  'EIR Review',
  'Final',
];

function fdaPipelineStepIndex(status: string): number {
  switch (status) {
    case 'created':
    case 'assigned':
    case 'in_progress':
    case 'draft_completed':
      return 0;
    case 'approved_483':
      return 1;
    case 'sent_to_firm':
      return 2;
    case 'eir_assigned':
      return 3;
    case 'eir_drafting':
      return 4;
    case 'eir_submitted':
    case 'under_review':
    case 'rework_required':
      return 5;
    case 'eir_approved':
    case 'approved':
    case 'closed':
      return 6;
    default:
      return 0;
  }
}

function isFdaPipelineMeta(metadataJson: string): boolean {
  try {
    return Boolean(JSON.parse(metadataJson || '{}').fda_pipeline);
  } catch {
    return false;
  }
}

function isFdaSequencedMeta(metadataJson: string): boolean {
  try {
    return Boolean(JSON.parse(metadataJson || '{}').fda_sequenced_workflow);
  } catch {
    return false;
  }
}

/** Primary drafting workspace URL for this inspection (483 vs EIR phase). */
/** Opens the New Inspection drafting UI (gated by WorkflowDraftWorkspace). */
function newInspectionDraftHref(ins: Inspection): string {
  const fdaSeq = isFdaSequencedMeta(ins.metadata_json);
  const st = ins.status;
  const q = new URLSearchParams({ inspectionId: ins.id });
  if (st === 'eir_drafting' || st === 'eir_assigned') {
    q.set('phase', 'eir');
    return `/new-inspection?${q.toString()}`;
  }
  if (st === 'draft_completed' && !fdaSeq) {
    q.set('phase', 'eir');
    return `/new-inspection?${q.toString()}`;
  }
  if (st === 'rework_required' && fdaSeq) {
    q.set('phase', 'eir');
    return `/new-inspection?${q.toString()}`;
  }
  return `/new-inspection?${q.toString()}`;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  CREATED: Clock, ASSIGNED: Users, STARTED: Play, DRAFT_COMPLETED: FileText,
  EIR_SUBMITTED: Send, REVIEW_STARTED: Eye, APPROVED: CheckCircle2,
  REJECTED: XCircle, REWORK_STARTED: RotateCcw, CLOSED: CheckCircle2,
  COMMENT_ADDED: MessageSquare, DOCUMENT_READY: FileText, REOPENED_FOR_NEXT_YEAR: RotateCcw,
  APPROVED_483: CheckCircle2, SENT_483_TO_FIRM: Mail, EIR_ASSIGNED: UserPlus,
  EIR_DRAFTING_STARTED: FileText, EIR_REWORK_STARTED: RotateCcw,
  '483_RETURNED_FOR_REVISION': RotateCcw,
};

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [timeline, setTimeline] = useState<WorkflowLog[]>([]);
  const [comments, setComments] = useState<InspectionComment[]>([]);
  const [versions, setVersions] = useState<InspectionVersion[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savedSignature, setSavedSignature] = useState<SavedSignature | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewComments, setReviewComments] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [showReviewModal, setShowReviewModal] = useState<'approve' | 'reject' | null>(null);
  const [signatureMode, setSignatureMode] = useState<'submit' | 'approve' | 'update' | null>(null);
  const [documentTab, setDocumentTab] = useState<'483' | 'eir'>('483');
  const [zoom, setZoom] = useState(1);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [downloadingFinal, setDownloadingFinal] = useState(false);
  const approvedVersionAutoSelectedRef = useRef<string | null>(null);
  const [firmEmail, setFirmEmail] = useState('');
  const [showSend483Modal, setShowSend483Modal] = useState(false);
  const [showReturn483Modal, setShowReturn483Modal] = useState(false);
  const [return483Comments, setReturn483Comments] = useState('');
  const [showAssignEirModal, setShowAssignEirModal] = useState(false);
  const [investigators, setInvestigators] = useState<{ id: string; first_name: string; last_name: string; email: string }[]>([]);
  const [assignToId, setAssignToId] = useState('');
  const [pipelineEirLoading, setPipelineEirLoading] = useState(false);
  const [companyHistory, setCompanyHistory] = useState<{ inspection_id: string; title: string; investigator_name: string | null; year: string; status: string }[]>([]);

  const isSupervisor = profile?.role === 'supervisor';

  const loadData = useCallback(async () => {
    try {
      const [profRes, inspRes, tlRes, commentsRes, versionsRes, signatureRes] = await Promise.all([
        fetch('/api/profile', { credentials: 'include' }),
        fetch(`/api/inspections/${id}`, { credentials: 'include' }),
        fetch(`/api/inspections/${id}/timeline`, { credentials: 'include' }),
        fetch(`/api/inspections/${id}/comments`, { credentials: 'include' }),
        fetch(`/api/inspections/${id}/versions`, { credentials: 'include' }),
        fetch('/api/profile/signature', { credentials: 'include' }),
      ]);
      if (profRes.ok) setProfile((await profRes.json()).profile);
      if (inspRes.ok) {
        setInspection((await inspRes.json()).inspection);
      } else if (inspRes.status === 403) {
        toast.error('Access restricted — this inspection is not assigned to you.');
        router.replace('/workflow');
        return;
      }
      if (tlRes.ok) setTimeline((await tlRes.json()).logs || []);
      if (commentsRes.ok) setComments((await commentsRes.json()).comments || []);
      if (versionsRes.ok) setVersions((await versionsRes.json()).versions || []);
      if (signatureRes.ok) setSavedSignature((await signatureRes.json()).signature || null);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!inspection?.firm_name || !isSupervisor) return;
    fetch(`/api/inspections/history?company_name=${encodeURIComponent(inspection.firm_name)}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { history: [] })
      .then(data => setCompanyHistory((data.history || []).filter((h: { inspection_id: string }) => h.inspection_id !== id)))
      .catch(() => setCompanyHistory([]));
  }, [inspection?.firm_name, isSupervisor, id]);

  useEffect(() => {
    approvedVersionAutoSelectedRef.current = null;
  }, [id]);

  async function handleTransition(transition: string, extra: Record<string, unknown> = {}): Promise<boolean> {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/inspections/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ transition, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Action failed');
        return false;
      }
      await loadData();
      queryClient.invalidateQueries({ queryKey: dashboardPublishStatsQueryKey });
      return true;
    } finally { setActionLoading(false); }
  }

  async function handleReview(decision: 'approved' | 'rework_required', signature?: Record<string, unknown>) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/inspections/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ decision, comments: reviewComments, signature }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(typeof err.error === 'string' ? err.error : 'Review action failed');
        return;
      }
      setShowReviewModal(null);
      setReviewComments('');
      await loadData();
      queryClient.invalidateQueries({ queryKey: dashboardPublishStatsQueryKey });
    } finally { setActionLoading(false); }
  }

  async function handleSend483ToFirm() {
    const email = firmEmail.trim();
    if (!email) {
      toast.error('Enter a firm email address');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/inspections/${id}/send-483`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ firm_email: email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Send to firm failed');
        return;
      }
      toast.success('Form FDA 483 sent to firm');
      setShowSend483Modal(false);
      setFirmEmail('');
      await loadData();
      queryClient.invalidateQueries({ queryKey: dashboardPublishStatsQueryKey });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleGeneratePipelineEir() {
    setPipelineEirLoading(true);
    try {
      const res = await fetch(`/api/inspections/${id}/generate-eir`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'EIR pipeline generation failed');
        return;
      }
      toast.success('EIR narrative generated');
      await loadData();
      queryClient.invalidateQueries({ queryKey: dashboardPublishStatsQueryKey });
    } finally {
      setPipelineEirLoading(false);
    }
  }

  async function handleAssignEirConfirm() {
    if (!assignToId) {
      toast.error('Select an investigator');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/inspections/${id}/assign-eir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assignedTo: assignToId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Assign EIR failed');
        return;
      }
      toast.success('EIR drafting assigned');
      setShowAssignEirModal(false);
      setAssignToId('');
      await loadData();
      queryClient.invalidateQueries({ queryKey: dashboardPublishStatsQueryKey });
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    if (!showAssignEirModal || !isSupervisor) return;
    fetch('/api/users/investigators', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setInvestigators(d.investigators || []))
      .catch(() => setInvestigators([]));
  }, [showAssignEirModal, isSupervisor]);

  async function handleAddComment() {
    if (!commentDraft.trim()) return;
    setActionLoading(true);
    try {
      await fetch(`/api/inspections/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comment: commentDraft }),
      });
      setCommentDraft('');
      await loadData();
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    if (!inspection) return;
    const st = inspection.status;
    if (st !== 'approved' && st !== 'eir_approved' && st !== 'closed') return;
    if (approvedVersionAutoSelectedRef.current === inspection.id) return;
    const approvedVersion = versions.find((v) => v.version_type === 'APPROVED');
    if (approvedVersion) {
      setSelectedVersionId(approvedVersion.id);
      approvedVersionAutoSelectedRef.current = inspection.id;
    }
  }, [inspection, versions]);

  useEffect(() => {
    if (!inspection) return;
    const fdaSeq = isFdaSequencedMeta(inspection.metadata_json);
    const allowEirTab =
      !fdaSeq ||
      ['eir_drafting', 'eir_submitted', 'under_review', 'rework_required', 'eir_approved', 'approved', 'closed'].includes(
        inspection.status,
      );
    if (!allowEirTab && documentTab === 'eir') setDocumentTab('483');
  }, [inspection, documentTab]);

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-navy-600" /></div>;
  }

  if (!inspection) {
    return <div className="flex h-96 flex-col items-center justify-center"><AlertTriangle className="mb-2 h-10 w-10 text-gray-300" /><p className="text-gray-500">Inspection not found</p></div>;
  }

  const status = inspection.status;
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.created;
  const fdaPipelineMeta = isFdaPipelineMeta(inspection.metadata_json);
  const fdaSequencedMeta = isFdaSequencedMeta(inspection.metadata_json);
  /** FDA-sequenced path: after 483 draft, status is still `draft_completed` but means “483 submitted for supervisor review,” not EIR. */
  const statusLabelDisplay =
    status === 'draft_completed' && fdaSequencedMeta
      ? '483 submitted (pending supervisor)'
      : cfg.label;
  /** FDA 483→EIR step strip: show from Created when inspection uses sequenced workflow (metadata), or when already in post–483 states. */
  const showFdaPipelineUi =
    fdaSequencedMeta ||
    ['approved_483', 'sent_to_firm', 'eir_assigned', 'eir_drafting'].includes(status) ||
    (fdaPipelineMeta && ['eir_submitted', 'under_review', 'rework_required', 'eir_approved', 'closed'].includes(status));
  const fdaStepIndex = fdaPipelineStepIndex(status);
  const allowWorkflowEirPreview =
    !fdaSequencedMeta ||
    ['eir_drafting', 'eir_submitted', 'under_review', 'rework_required', 'eir_approved', 'approved', 'closed'].includes(
      status,
    );
  const isFinalApproved = status === 'approved' || status === 'eir_approved' || status === 'closed';
  const currentStepIndex = WORKFLOW_STEPS.indexOf(status);
  const currentPayload = (() => {
    if (selectedVersionId) {
      const selectedVersion = versions.find((item) => item.id === selectedVersionId);
      if (selectedVersion) {
        try {
          return JSON.parse(selectedVersion.payload_json);
        } catch {
          return null;
        }
      }
    }
    return null;
  })();
  const observations = currentPayload?.observations ?? (() => { try { return JSON.parse(inspection.observations_json || '[]'); } catch { return []; } })();
  const eirRaw = currentPayload?.eir ?? (() => { try { return JSON.parse(inspection.eir_json || '{}'); } catch { return {}; } })();
  const eir = (() => {
    const o = typeof eirRaw === 'object' && eirRaw !== null ? { ...(eirRaw as Record<string, unknown>) } : {};
    delete o.traceability;
    return o as Record<string, string>;
  })();
  const rawNotesForExport =
    (currentPayload as { raw_notes?: string } | null)?.raw_notes ?? inspection.raw_notes ?? '';
  const metadata: InspectionMetadata = currentPayload?.metadata ?? (() => {
    try {
      const parsed = JSON.parse(inspection.metadata_json || '{}');
      return {
        firm_name: parsed.firm_name || inspection.firm_name,
        fei_number: parsed.fei_number || inspection.fei_number,
        street_address: parsed.street_address || inspection.street_address || '',
        city: parsed.city || inspection.city || '',
        state: parsed.state || inspection.state || '',
        zip_code: parsed.zip_code || inspection.zip_code || '',
        country: parsed.country || inspection.country || 'United States',
        establishment_type: parsed.establishment_type || inspection.establishment_type || '',
        inspection_start: parsed.inspection_start || inspection.inspection_start || '',
        inspection_end: parsed.inspection_end || inspection.inspection_end || '',
        district_office: parsed.district_office || inspection.district_office || '',
        investigators: parsed.investigators || [
          {
            name: inspection.assignee_name || '',
            title: 'Investigator',
          },
        ],
        report_issued_to_name: parsed.report_issued_to_name || '',
        report_issued_to_title: parsed.report_issued_to_title || '',
        investigator_signature_type: parsed.investigator_signature_type || '',
        investigator_signature_text: parsed.investigator_signature_text || '',
        investigator_signature_image: parsed.investigator_signature_image || '',
        investigator_signed_name: parsed.investigator_signed_name || inspection.assignee_name || '',
        investigator_signed_at: parsed.investigator_signed_at || '',
        supervisor_signature_type: parsed.supervisor_signature_type || '',
        supervisor_signature_text: parsed.supervisor_signature_text || '',
        supervisor_signature_image: parsed.supervisor_signature_image || '',
        supervisor_signed_name: parsed.supervisor_signed_name || inspection.creator_name || '',
        supervisor_signed_at: parsed.supervisor_signed_at || '',
      };
    } catch {
      return {
        firm_name: inspection.firm_name,
        fei_number: inspection.fei_number,
        street_address: inspection.street_address || '',
        city: inspection.city || '',
        state: inspection.state || '',
        zip_code: inspection.zip_code || '',
        country: inspection.country || 'United States',
        establishment_type: inspection.establishment_type || '',
        inspection_start: inspection.inspection_start || '',
        inspection_end: inspection.inspection_end || '',
        district_office: inspection.district_office || '',
        investigators: [{ name: inspection.assignee_name || '', title: 'Investigator' }],
        report_issued_to_name: '',
        report_issued_to_title: '',
      };
    }
  })();

  const lastAction = timeline[timeline.length - 1];
  const reviewStarted = [...timeline].reverse().find((item) => item.action === 'REVIEW_STARTED');
  const latestRework = [...timeline].reverse().find((item) => item.action === 'REJECTED');
  const signatureReady = Boolean(savedSignature?.signature_text || savedSignature?.signature_image);
  const signaturesCompleted = Number(Boolean(metadata.investigator_signature_text || metadata.investigator_signature_image)) + Number(Boolean(metadata.supervisor_signature_text || metadata.supervisor_signature_image));
  const turnLabel = (() => {
    if (status === 'approved' || status === 'eir_approved' || status === 'closed') return 'Approved and Ready to Publish';
    if (status === 'rework_required') return 'Rework Required by Investigator';
    if (status === 'eir_submitted' || status === 'under_review') return 'Waiting for Supervisor Review';
    if (status === 'approved_483') return 'Supervisor: Send Form FDA 483 to firm';
    if (status === 'sent_to_firm') return 'Supervisor: Assign EIR drafting';
    if (status === 'eir_assigned') return 'Investigator: Begin EIR drafting';
    if (status === 'eir_drafting') return 'Investigator: Draft & submit EIR';
    if (status === 'draft_completed') {
      if (isSupervisor) return 'Supervisor: Review FDA 483 — approve or return for revision';
      return fdaSequencedMeta
        ? 'Waiting for supervisor approval of Form FDA 483'
        : 'Investigator: review draft or sign and submit EIR (legacy path)';
    }
    if (status === 'created' || status === 'assigned' || status === 'in_progress') {
      return fdaSequencedMeta
        ? '483 draft → supervisor approves 483 → firm → assign EIR → EIR draft'
        : 'Waiting for Investigator';
    }
    return 'Waiting for Investigator';
  })();

  /** FDA sequenced path uses EIR rework resume (not legacy in_progress). */
  const useFdaReworkResume = fdaPipelineMeta || fdaSequencedMeta;

  const onSignatureCaptured = async (payload: {
    signatureImage: string;
    signatureText?: string;
    signatureType: 'draw' | 'type';
    signedName: string;
    signedAt: string;
  }) => {
    const signature = {
      signatureType: payload.signatureType,
      signatureText: payload.signatureText || payload.signedName,
      signatureImage: payload.signatureImage,
      signedName: payload.signedName,
      signedAt: payload.signedAt,
    };
    if (signatureMode === 'submit') {
      await handleTransition('submit_eir', { signature });
    } else if (signatureMode === 'approve') {
      await handleReview('approved', signature);
    } else {
      await fetch('/api/profile/signature', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(signature),
      });
      await loadData();
    }
    setSignatureMode(null);
  };

  const usingSavedSignature = {
    signatureType: savedSignature?.signature_type || 'type',
    signatureText: savedSignature?.signature_text || savedSignature?.signed_name || '',
    signatureImage: savedSignature?.signature_image || '',
    signedName: savedSignature?.signed_name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
    signedAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/workflow')} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{inspection.title}</h1>
          <p className="text-sm text-gray-500">{inspection.firm_name} {inspection.fei_number ? `(FEI: ${inspection.fei_number})` : ''}</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${cfg.color} ${cfg.bg}`}>{statusLabelDisplay}</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">AI evaluation & review</p>
            <p className="text-xs text-gray-500">
              Drafting-quality scores (CFR match, grounding, structure), validation review, and audit trail for this inspection.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/evaluation/${encodeURIComponent(inspection.id)}`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-navy-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-navy-800"
            >
              <LineChart className="h-4 w-4" />
              Evaluation dashboard
            </Link>
            <Link
              href={`/evaluation?inspection_id=${encodeURIComponent(inspection.id)}`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              Run list (doc IDs)
            </Link>
            <Link
              href={`/workflow/${encodeURIComponent(inspection.id)}/review`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              AI validation review
            </Link>
            <Link
              href={`/workflow/${encodeURIComponent(inspection.id)}/audit`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
            >
              Audit trail
            </Link>
          </div>
        </div>
      </div>

      {!isSupervisor && isFinalApproved && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          <p className="font-semibold">Final approved package</p>
          <p className="mt-1 text-green-800">
            Your drafted FDA 483 / EIR is shown below (approved snapshot with signatures). Use <strong>Download</strong> to export the same content, or open <strong>Document Library</strong> for the archived record.
          </p>
        </div>
      )}

      {/* Workflow Progress Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">
          {showFdaPipelineUi ? 'Workflow Progress (FDA 483 → EIR)' : 'Workflow Progress'}
        </h3>
        {showFdaPipelineUi ? (
          <>
            <div className="flex flex-wrap items-center gap-1 md:flex-nowrap">
              {FDA_PIPELINE_STEPS.map((step, i) => {
                const isComplete = i < fdaStepIndex;
                const isCurrent = i === fdaStepIndex;
                const isRework = status === 'rework_required';
                return (
                  <div key={step} className="flex min-w-0 flex-1 items-center">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isComplete ? 'bg-green-500 text-white' : isCurrent ? (isRework ? 'bg-red-500 text-white' : 'bg-navy-600 text-white') : 'bg-gray-200 text-gray-400'
                    }`}>
                      {isComplete ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    {i < FDA_PIPELINE_STEPS.length - 1 && (
                      <div className={`mx-1 h-0.5 min-w-[8px] flex-1 ${isComplete ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-y-1">
              {FDA_PIPELINE_STEPS.map((step) => (
                <div key={step} className="min-w-[12%] flex-1 text-center text-[10px] text-gray-500">{step}</div>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Current stage: <span className="font-semibold text-gray-700">{FDA_PIPELINE_STEPS[fdaStepIndex]}</span>
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1">
              {WORKFLOW_STEPS.map((step, i) => {
                const isComplete = i < currentStepIndex;
                const isCurrent = i === currentStepIndex;
                const isRework = status === 'rework_required';
                return (
                  <div key={step} className="flex flex-1 items-center">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      isComplete ? 'bg-green-500 text-white' : isCurrent ? (isRework ? 'bg-red-500 text-white' : 'bg-navy-600 text-white') : 'bg-gray-200 text-gray-400'
                    }`}>
                      {isComplete ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    {i < WORKFLOW_STEPS.length - 1 && (
                      <div className={`mx-1 h-0.5 flex-1 ${isComplete ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex">
              {WORKFLOW_STEPS.map(step => (
                <div key={step} className="flex-1 text-center text-[10px] text-gray-400">{STATUS_CONFIG[step]?.label}</div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* FDA 483 gate steps — surfaced here so supervisors do not miss Send to Firm / Return for revision */}
      {isSupervisor && ['draft_completed', 'approved_483', 'sent_to_firm'].includes(status) && (
        <div
          id="workflow-actions"
          className="rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50/90 to-white p-4 shadow-sm"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-sky-900">Supervisor — Form FDA 483 workflow</p>
          <div className="flex flex-wrap gap-3">
            {status === 'draft_completed' && (
              <>
                <button
                  type="button"
                  onClick={() => handleTransition('approve_483')}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve Form FDA 483
                </button>
                <button
                  type="button"
                  onClick={() => setShowReturn483Modal(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" /> Return 483 for revision
                </button>
              </>
            )}
            {status === 'approved_483' && (
              <button
                type="button"
                onClick={() => setShowSend483Modal(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
              >
                <Mail className="h-4 w-4" /> Send to Firm
              </button>
            )}
            {status === 'sent_to_firm' && (
              <button
                type="button"
                onClick={() => setShowAssignEirModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" /> Assign EIR Drafting
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-sky-800/80">
            After the 483 is approved, email it to the firm from here, then assign who will draft the EIR. Audit entries are recorded for each step.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Details, Viewer, Comments */}
        <div className="space-y-6 lg:col-span-2">
          {status === 'rework_required' && latestRework && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-semibold text-red-900">Returned for rework</p>
                  <p className="mt-1 text-sm text-red-800">{latestRework.comments || 'Supervisor feedback is available below.'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Current Status" value={statusLabelDisplay} />
            <SummaryCard label="Current Owner / Turn" value={turnLabel} />
            <SummaryCard label="Last Action" value={lastAction ? lastAction.action.replace(/_/g, ' ') : '—'} />
            <SummaryCard label="Reviewer Comments" value={String(comments.length)} />
            <SummaryCard label="Signatures" value={`${signaturesCompleted}/2 complete`} />
            <SummaryCard label="Review Started" value={reviewStarted ? new Date(reviewStarted.created_at).toLocaleDateString() : '—'} />
            <SummaryCard label="Last Updated" value={new Date(inspection.updated_at).toLocaleString()} />
            <SummaryCard label="Final Document Status" value={isFinalApproved ? 'Ready to publish' : 'Draft in progress'} />
          </div>

          {/* Inspection Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Inspection Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-gray-400">District Office</p><p className="font-medium text-gray-900">{inspection.district_office || '—'}</p></div>
              <div><p className="text-gray-400">Establishment Type</p><p className="font-medium text-gray-900">{inspection.establishment_type || '—'}</p></div>
              <div><p className="text-gray-400">Dates</p><p className="font-medium text-gray-900">{inspection.inspection_start || '—'} to {inspection.inspection_end || '—'}</p></div>
              <div><p className="text-gray-400">Assigned To</p><p className="font-medium text-gray-900">{inspection.assignee_name || 'Unassigned'}</p></div>
              <div><p className="text-gray-400">Created By</p><p className="font-medium text-gray-900">{inspection.creator_name}</p></div>
              <div><p className="text-gray-400">Created</p><p className="font-medium text-gray-900">{new Date(inspection.created_at).toLocaleDateString()}</p></div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Document preview</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Page-style preview for investigator drafting and supervisor review.
                  {isFinalApproved && selectedVersionId && (
                    <span className="ml-1 font-medium text-navy-700"> Showing approved snapshot.</span>
                  )}
                  {fdaSequencedMeta && !allowWorkflowEirPreview && (
                    <span className="ml-1 block text-amber-800"> EIR preview is available after EIR drafting begins (workflow status: EIR Drafting).</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-lg border border-gray-200 p-1">
                  <button
                    onClick={() => setDocumentTab('483')}
                    className={`rounded-md px-3 py-1.5 text-sm ${documentTab === '483' ? 'bg-navy-700 text-white' : 'text-gray-600'}`}
                  >
                    FDA 483
                  </button>
                  <button
                    type="button"
                    onClick={() => allowWorkflowEirPreview && setDocumentTab('eir')}
                    disabled={!allowWorkflowEirPreview}
                    title={!allowWorkflowEirPreview ? 'Open after EIR drafting phase' : undefined}
                    className={`rounded-md px-3 py-1.5 text-sm ${documentTab === 'eir' ? 'bg-navy-700 text-white' : 'text-gray-600'} disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    EIR
                  </button>
                </div>
                <button onClick={() => setZoom((current) => Math.max(0.8, current - 0.1))} className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50">
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button onClick={() => setZoom((current) => Math.min(1.4, current + 0.1))} className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50">
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="overflow-auto rounded-2xl bg-slate-100 p-6">
              <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
                {documentTab === '483' ? (
                  <Form483Preview metadata={metadata} observations={observations} watermark={isFinalApproved ? 'FINAL' : 'DRAFT'} />
                ) : (
                  <EIRPreview metadata={metadata} eir={eir} observations={observations as DraftObservation[]} />
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <button
                onClick={() => router.push(newInspectionDraftHref(inspection))}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                <FileText className="h-4 w-4" /> Open Latest Version
              </button>
              <span className="text-gray-500">Scroll page-by-page to review the current or selected version.</span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">Review Comments</h3>
                <p className="mt-1 text-xs text-gray-500">Comments are preserved in the audit trail and visible to both roles.</p>
              </div>
              <button
                onClick={() => setSignatureMode('update')}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <PenLine className="h-4 w-4" />
                {signatureReady ? 'Update Signature' : 'Save Signature'}
              </button>
            </div>
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-gray-400">No review comments yet.</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{comment.author_name || 'Unknown reviewer'}</p>
                        <p className="text-xs uppercase tracking-wide text-gray-400">{comment.author_role}</p>
                      </div>
                      <p className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString()}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-gray-700">{comment.comment}</p>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
              <textarea
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                rows={4}
                placeholder={isSupervisor ? 'Add evidence-grounded review comments for the investigator...' : 'Add clarification or response notes for the supervisor...'}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleAddComment}
                  disabled={actionLoading || !commentDraft.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
                >
                  <MessageSquare className="h-4 w-4" />
                  Add Comment
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Actions</h3>
            <div className="flex flex-wrap gap-3">
              {!isSupervisor && status === 'assigned' && (
                <button onClick={() => handleTransition('start')} disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                  <Play className="h-4 w-4" /> Start Inspection
                </button>
              )}
              {!isSupervisor && status === 'in_progress' && (
                <>
                  <button onClick={() => router.push(newInspectionDraftHref(inspection))}
                    className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
                    <FileText className="h-4 w-4" /> Draft 483 / EIR
                  </button>
                  <button onClick={() => handleTransition('complete_draft')} disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
                    <ClipboardCheck className="h-4 w-4" /> Mark Draft Complete
                  </button>
                </>
              )}
              {!isSupervisor && status === 'draft_completed' && (
                <>
                  <button
                    onClick={() => router.push(newInspectionDraftHref(inspection))}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <SearchCheck className="h-4 w-4" /> Review Draft
                  </button>
                  {fdaSequencedMeta ? (
                    <div className="flex min-w-[220px] max-w-[min(100%,28rem)] flex-col gap-1 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                      <p className="font-semibold">Form FDA 483 submitted</p>
                      <p className="text-teal-800/90">
                        Awaiting supervisor review. You will be notified when the 483 is approved or returned for revision. The EIR step comes after the 483 is approved and sent to the firm.
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => signatureReady ? handleTransition('submit_eir', { signature: usingSavedSignature }) : setSignatureMode('submit')}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" /> Sign and Submit EIR
                    </button>
                  )}
                </>
              )}
              {!isSupervisor && status === 'eir_assigned' && (
                <>
                  {fdaSequencedMeta && observations.length > 0 && (
                    <button
                      type="button"
                      title="EIR can only be generated after FDA Form 483 approval and assignment to EIR drafting."
                      onClick={() => void handleGeneratePipelineEir()}
                      disabled={pipelineEirLoading}
                      className="inline-flex items-center gap-2 rounded-lg border border-navy-300 bg-navy-50 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-100 disabled:opacity-50"
                    >
                      {pipelineEirLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Generate EIR (AI pipeline)
                    </button>
                  )}
                  <button
                    onClick={() => handleTransition('start_eir_draft')}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" /> Begin EIR Drafting
                  </button>
                </>
              )}
              {!isSupervisor && status === 'eir_drafting' && (
                <>
                  {fdaSequencedMeta && (
                    <button
                      type="button"
                      title="EIR can only be generated after FDA Form 483 approval and assignment to EIR drafting."
                      onClick={() => void handleGeneratePipelineEir()}
                      disabled={pipelineEirLoading || observations.length === 0}
                      className="inline-flex items-center gap-2 rounded-lg border border-navy-300 bg-navy-50 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-100 disabled:opacity-50"
                    >
                      {pipelineEirLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Generate EIR (AI pipeline)
                    </button>
                  )}
                  <button
                    onClick={() => router.push(newInspectionDraftHref(inspection))}
                    className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
                  >
                    <FileText className="h-4 w-4" /> Open EIR Draft
                  </button>
                  <button
                    onClick={() => signatureReady ? handleTransition('submit_eir', { signature: usingSavedSignature }) : setSignatureMode('submit')}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-700 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" /> Sign and Submit EIR
                  </button>
                </>
              )}
              {!isSupervisor && status === 'rework_required' && (
                <>
                  <button onClick={() => router.push(newInspectionDraftHref(inspection))}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    <FileText className="h-4 w-4" /> Open Rework Draft
                  </button>
                  {fdaSequencedMeta && observations.length > 0 && (
                    <button
                      type="button"
                      title="EIR can only be generated after FDA Form 483 approval and assignment to EIR drafting."
                      onClick={() => void handleGeneratePipelineEir()}
                      disabled={pipelineEirLoading}
                      className="inline-flex items-center gap-2 rounded-lg border border-navy-300 bg-navy-50 px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-100 disabled:opacity-50"
                    >
                      {pipelineEirLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Generate EIR (AI pipeline)
                    </button>
                  )}
                  {useFdaReworkResume ? (
                    <button onClick={() => handleTransition('resume_eir_rework')} disabled={actionLoading}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                      <RotateCcw className="h-4 w-4" /> Resume EIR Rework
                    </button>
                  ) : (
                    <button onClick={() => handleTransition('resume_rework')} disabled={actionLoading}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                      <RotateCcw className="h-4 w-4" /> Resume Rework
                    </button>
                  )}
                </>
              )}
              {isSupervisor && status === 'eir_submitted' && (
                <button onClick={() => handleTransition('start_review')} disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50">
                  <Eye className="h-4 w-4" /> Begin Review
                </button>
              )}
              {isSupervisor && status === 'under_review' && (
                <>
                  <button onClick={() => setShowReviewModal('approve')}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </button>
                  <button onClick={() => setShowReviewModal('reject')}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                    <XCircle className="h-4 w-4" /> Return for Rework
                  </button>
                </>
              )}
              {isSupervisor && (status === 'approved' || status === 'eir_approved') && (
                <>
                  <Link href="/library" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    <Eye className="h-4 w-4" /> View Document Library
                  </Link>
                  <button onClick={() => handleTransition('close')} disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50">
                    <CheckCircle2 className="h-4 w-4" /> Close Inspection
                  </button>
                </>
              )}
              {!isSupervisor && isFinalApproved && (
                <>
                  <Link
                    href="/library"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <FolderOpen className="h-4 w-4" /> Document Library
                  </Link>
                  <button
                    type="button"
                    disabled={downloadingFinal || observations.length === 0}
                    onClick={async () => {
                      setDownloadingFinal(true);
                      try {
                        await downloadDocument('483', {
                          form_data: metadata,
                          observations: observations as DraftObservation[],
                          raw_notes: rawNotesForExport,
                        });
                      } finally {
                        setDownloadingFinal(false);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
                  >
                    {downloadingFinal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Download FDA 483
                  </button>
                  <button
                    type="button"
                    disabled={downloadingFinal}
                    onClick={async () => {
                      setDownloadingFinal(true);
                      try {
                        await downloadDocument('both', {
                          form_data: metadata,
                          observations: observations as DraftObservation[],
                          raw_notes: rawNotesForExport,
                        });
                      } finally {
                        setDownloadingFinal(false);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <FileText className="h-4 w-4" /> Download 483 + EIR (.zip)
                  </button>
                </>
              )}
              {isFinalApproved && (
                <span className="inline-flex items-center gap-2 text-sm font-medium text-green-600">
                  <CheckCircle2 className="h-5 w-5" /> Inspection package endorsed and archived
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Version History</h3>
            {versions.length === 0 ? (
              <p className="text-sm text-gray-400">No saved versions yet.</p>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => setSelectedVersionId(null)}
                  className={`w-full rounded-xl border px-3 py-3 text-left ${selectedVersionId === null ? 'border-navy-300 bg-navy-50' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <p className="text-sm font-semibold text-gray-900">Current draft</p>
                  <p className="mt-1 text-xs text-gray-500">Live inspection record</p>
                </button>
                {versions.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => setSelectedVersionId(version.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left ${selectedVersionId === version.id ? 'border-navy-300 bg-navy-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-900">Version {version.version_number}</p>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">{version.version_type}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{version.creator_name || 'Unknown'} • {new Date(version.created_at).toLocaleString()}</p>
                    {version.comments_snapshot && <p className="mt-2 text-xs text-gray-600">{version.comments_snapshot}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Audit Trail</h3>
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-400">No events yet</p>
            ) : (
              <div className="relative space-y-0">
                {timeline.map((log, i) => {
                  const Icon = ACTION_ICONS[log.action] || ChevronRight;
                  const isLast = i === timeline.length - 1;
                  return (
                    <div key={log.id} className="relative flex gap-3 pb-6">
                      {!isLast && <div className="absolute left-[15px] top-8 h-full w-px bg-gray-200" />}
                      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-100">
                        <Icon className="h-4 w-4 text-navy-600" />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm font-semibold text-gray-900">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-gray-500">{log.performer_name}</p>
                        {log.comments && <p className="mt-1 text-xs text-gray-600 italic">"{log.comments}"</p>}
                        <p className="mt-1 text-[10px] text-gray-400">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {isSupervisor && companyHistory.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-semibold text-gray-700">Company Inspection History — {inspection?.firm_name}</h3>
              <div className="overflow-hidden rounded-lg border border-gray-100">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Year</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Title</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Investigator</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {companyHistory.map(h => (
                      <tr key={h.inspection_id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-600">{h.year}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => router.push(`/workflow/${h.inspection_id}`)}
                            className="text-navy-700 font-medium hover:underline"
                          >{h.title}</button>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{h.investigator_name || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${(STATUS_CONFIG[h.status] || STATUS_CONFIG.created).color} ${(STATUS_CONFIG[h.status] || STATUS_CONFIG.created).bg}`}>
                            {(STATUS_CONFIG[h.status] || STATUS_CONFIG.created).label}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Signature Readiness</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>Current user signature: <span className="font-medium text-gray-900">{signatureReady ? 'Saved and ready' : 'Pending'}</span></p>
              <p>Investigator signature: <span className="font-medium text-gray-900">{metadata.investigator_signature_text || metadata.investigator_signature_image ? 'Applied' : 'Pending'}</span></p>
              <p>Supervisor signature: <span className="font-medium text-gray-900">{metadata.supervisor_signature_text || metadata.supervisor_signature_image ? 'Applied' : 'Pending'}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              {showReviewModal === 'approve' ? 'Approve Inspection Package' : 'Return for Rework'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {showReviewModal === 'approve'
                ? 'This will endorse the inspection package and mark it as approved.'
                : 'This will return the inspection to the investigator for corrections.'}
            </p>
            {showReviewModal === 'approve' && (
              <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                Supervisor signature is required before approval. {signatureReady ? 'Your saved signature will be reused unless you capture a new one.' : 'Capture a signature to continue.'}
              </div>
            )}
            <textarea
              value={reviewComments}
              onChange={e => setReviewComments(e.target.value)}
              placeholder={showReviewModal === 'approve' ? 'Optional approval comments...' : 'Describe what needs to be reworked...'}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => { setShowReviewModal(null); setReviewComments(''); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => {
                  if (showReviewModal === 'approve') {
                    if (signatureReady) {
                      handleReview('approved', usingSavedSignature);
                    } else {
                      setSignatureMode('approve');
                    }
                    return;
                  }
                  handleReview('rework_required');
                }}
                disabled={actionLoading}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                  showReviewModal === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionLoading ? 'Processing...' : showReviewModal === 'approve' ? 'Approve' : 'Return for Rework'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReturn483Modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Return FDA 483 for revision</h2>
            <p className="text-sm text-gray-500 mb-4">
              The inspection returns to <strong className="text-gray-800">in progress</strong> so the investigator can update the draft. Optional notes appear in the audit trail and notification.
            </p>
            <textarea
              value={return483Comments}
              onChange={(e) => setReturn483Comments(e.target.value)}
              placeholder="Comments for the investigator…"
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowReturn483Modal(false);
                  setReturn483Comments('');
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const ok = await handleTransition('return_483_revision', { comments: return483Comments.trim() });
                  if (ok) {
                    setShowReturn483Modal(false);
                    setReturn483Comments('');
                    toast.success('483 draft returned to investigator');
                  }
                }}
                disabled={actionLoading}
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
              >
                Return for revision
              </button>
            </div>
          </div>
        </div>
      )}

      {showSend483Modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Send Form FDA 483 to firm</h2>
            <p className="text-sm text-gray-500 mb-4">Enter the firm contact email. A Word copy of the current FDA 483 will be attached.</p>
            <input
              type="email"
              value={firmEmail}
              onChange={(e) => setFirmEmail(e.target.value)}
              placeholder="firm@example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => { setShowSend483Modal(false); setFirmEmail(''); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleSend483ToFirm} disabled={actionLoading} className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50">Send email</button>
            </div>
          </div>
        </div>
      )}

      {showAssignEirModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Assign EIR drafting</h2>
            <p className="text-sm text-gray-500 mb-4">Select the investigator who will draft the Establishment Inspection Report.</p>
            <select
              value={assignToId}
              onChange={(e) => setAssignToId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
            >
              <option value="">— Select investigator —</option>
              {investigators.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.first_name} {inv.last_name} ({inv.email})
                </option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => { setShowAssignEirModal(false); setAssignToId(''); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleAssignEirConfirm} disabled={actionLoading} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50">Assign</button>
            </div>
          </div>
        </div>
      )}

      <SignatureCapture
        open={signatureMode !== null}
        onClose={() => setSignatureMode(null)}
        onSign={onSignatureCaptured}
        investigatorName={`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || inspection.assignee_name || inspection.creator_name}
        title={signatureMode === 'approve' ? 'Supervisor approval signature' : signatureMode === 'submit' ? 'Investigator submission signature' : 'Saved signature profile'}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

