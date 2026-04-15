"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Download, FolderOpen, AlertTriangle, FileText, X, Loader2, ExternalLink, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { getLibrary, getLibraryItem, deleteLibraryItem, downloadDocument } from '@/lib/api';
import type { ApprovedDocumentRecord, DocumentLibraryItem } from '@/types/inspection';
import type { InspectionMetadata, DraftObservation } from '@/types/inspection';

export default function Library() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<DocumentLibraryItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [openGuardTarget, setOpenGuardTarget] = useState<DocumentLibraryItem | null>(null);
  const [approvedDocs, setApprovedDocs] = useState<ApprovedDocumentRecord[]>([]);
  const [approvedLoading, setApprovedLoading] = useState(true);
  const [approvedYear, setApprovedYear] = useState('');
  const [approvedStatus, setApprovedStatus] = useState('');

  const library = useQuery({ queryKey: ['library'], queryFn: getLibrary });

  useEffect(() => {
    const loadApproved = async () => {
      try {
        setApprovedLoading(true);
        const search = new URLSearchParams();
        if (approvedYear) search.set('year', approvedYear);
        if (approvedStatus) search.set('status', approvedStatus);
        const response = await fetch(`/api/document-library?${search.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await response.json();
        if (response.ok) setApprovedDocs(data.documents || []);
      } finally {
        setApprovedLoading(false);
      }
    };
    loadApproved();
  }, [approvedYear, approvedStatus]);

  const handleDownload = async (item: DocumentLibraryItem) => {
    setDownloadingId(item.id);
    try {
      const full = await getLibraryItem(item.id);
      const formData = full.metadata as InspectionMetadata;
      const observations = (full.observations ?? []) as DraftObservation[];
      const type = (item.document_type === '483' || item.document_type === 'eir' || item.document_type === 'both')
        ? item.document_type
        : '483';
      await downloadDocument(type, { form_data: formData, observations });
      toast.success('Document downloaded');
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteLibraryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      setDeleteTarget(null);
    },
  });

  const items = library.data ?? [];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      in_progress: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      under_review: 'bg-amber-50 text-amber-800 border-amber-200',
      published: 'bg-green-50 text-green-700 border-green-200',
      archived: 'bg-gray-50 text-gray-600 border-gray-200',
    };
    return map[status.toLowerCase()] ?? 'bg-gray-50 text-gray-600 border-gray-200';
  };

  const inspectionStatusLabel = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === 'draft' || normalized === 'in_progress') return 'IN PROGRESS';
    if (normalized === 'under_review') return 'PENDING REVIEW';
    if (normalized === 'published') return 'CLOSED';
    if (normalized === 'archived') return 'CLOSED';
    return normalized.replace(/_/g, ' ').toUpperCase();
  };

  const formatFeiNumber = (value: string) => {
    const digitsOnly = value.replace(/\D+/g, '');
    if (!digitsOnly) return '—';
    return digitsOnly.slice(-10).padStart(10, '0');
  };

  const approvedLibraryStatusBadge = (status: string): { label: string; className: string } => {
    const s = status.toLowerCase();
    if (s === 'published') {
      return {
        label: 'PUBLISHED',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      };
    }
    if (s === 'ready_to_publish') {
      return {
        label: 'READY TO PUBLISH',
        className: 'border-green-200 bg-green-50 text-green-700',
      };
    }
    return {
      label: s.replace(/_/g, ' ').toUpperCase() || '—',
      className: 'border-gray-200 bg-gray-50 text-gray-700',
    };
  };

  const status483Label = (item: DocumentLibraryItem) => {
    const type = item.document_type.toLowerCase();
    const status = item.status.toLowerCase();
    if (type === 'eir') return 'NOT GENERATED';
    if (status === 'draft') return 'DRAFT';
    if (status === 'under_review') return 'UNDER REVIEW';
    if (status === 'published') return 'PUBLISHED';
    return status.replace(/_/g, ' ').toUpperCase();
  };

  const canOpen483 = (item: DocumentLibraryItem) => {
    const type = item.document_type.toLowerCase();
    return (type === '483' || type === 'both') && item.observation_count > 0;
  };

  const handleOpen = (item: DocumentLibraryItem) => {
    if (!canOpen483(item)) {
      setOpenGuardTarget(item);
      return;
    }
    window.open(`/document/483/${item.id}`, '_blank', 'noopener,noreferrer');
  };

  const handleApprovedView = (item: ApprovedDocumentRecord) => {
    if (item.inspection_id) {
      router.push(`/workflow/${item.inspection_id}`);
    }
  };

  const handleApprovedDownload = async (item: ApprovedDocumentRecord) => {
    try {
      const response = await fetch(`/api/document-library?id=${item.id}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load document');
      const metadata = JSON.parse(data.document.final_metadata_json || '{}') as InspectionMetadata;
      const observations = JSON.parse(data.document.final_observations_json || '[]') as DraftObservation[];
      await downloadDocument('483', { form_data: metadata, observations });
      toast.success('Approved document downloaded');
    } catch {
      toast.error('Download failed');
    }
  };

  const handleReopen = async (item: ApprovedDocumentRecord) => {
    try {
      const response = await fetch(`/api/document-library/${item.id}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to reopen document');
      toast.success('Created new workflow cycle from approved document');
      router.push(`/workflow/${data.inspection.id}`);
    } catch {
      toast.error('Could not reopen document');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Document Library</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your saved inspection documents.</p>
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Approved Documents</h2>
        <p className="text-sm text-gray-500">
          Supervisor-approved packages: <strong className="text-gray-700">Published</strong> (issued / closed) and{' '}
          <strong className="text-gray-700">Ready to publish</strong> (pending final publish).
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Year</label>
            <input
              value={approvedYear}
              onChange={(e) => setApprovedYear(e.target.value)}
              placeholder="2026"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">Status</label>
            <select
              value={approvedStatus}
              onChange={(e) => setApprovedStatus(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="published">Published</option>
              <option value="ready_to_publish">Ready to Publish</option>
            </select>
          </div>
        </div>
      </div>

      {approvedLoading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading approved documents...</div>
      ) : approvedDocs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-sm text-gray-500">
          No approved documents yet. Final approved inspection packages will appear here after supervisor sign-off.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Inspection</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Approved Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Investigator</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Supervisor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {approvedDocs.map((item) => {
                  const statusBadge = approvedLibraryStatusBadge(item.status);
                  return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{item.title}</td>
                    <td className="px-4 py-3 text-gray-600">{item.approved_at ? format(new Date(item.approved_at), 'MMM d, yyyy') : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{item.investigator_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{item.supervisor_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge.className}`}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleApprovedView(item)}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-navy-50 hover:text-navy-700"
                          title="View"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleApprovedDownload(item)}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleReopen(item)}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-700"
                          title="Reopen Next Year"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Active drafts</h2>
        <p className="text-sm text-gray-500">
          In-progress saves from New Inspection (same firm/FEI shows the latest draft only). Rows clear when the workflow is
          approved to the document library.
        </p>
      </div>

      {library.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : library.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">Failed to load library.</p>
          <button
            onClick={() => library.refetch()}
            className="mt-2 text-sm font-medium text-red-600 underline hover:text-red-700"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
            <FolderOpen className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No documents saved yet.</p>
          <p className="mt-1 text-sm text-gray-400">
            Start a new inspection to generate documents.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Firm Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">FEI #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Start Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">483 Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{item.firm_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-600">
                      {formatFeiNumber(item.fei_number)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {item.inspection_start ? format(new Date(item.inspection_start), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadge(item.status)}`}>
                        {item.status_display ?? inspectionStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                      <span className="inline-flex items-center gap-1 text-gray-700">
                        <FileText className="h-3.5 w-3.5" />
                        {status483Label(item)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpen(item)}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-navy-50 hover:text-navy-700"
                          title="Open"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(item)}
                          disabled={downloadingId === item.id}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                          title="Download"
                        >
                          {downloadingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {openGuardTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">FDA 483 not generated</h3>
                <p className="mt-1 text-sm text-gray-600">
                  You need to generate FDA 483 observations with citation first. Only then can you access the document for electronic signature.
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setOpenGuardTarget(null)}
                className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Delete Document</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Are you sure you want to delete the document for <strong>{deleteTarget.firm_name}</strong>? This action cannot be undone.
                </p>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="ml-auto text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


