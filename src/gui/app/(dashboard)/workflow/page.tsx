'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { dashboardPublishStatsQueryKey } from '@/lib/dashboard-publish-stats';
import {
  Plus, Users, ClipboardCheck, Eye, CheckCircle2, XCircle, RotateCcw,
  ChevronDown, Search, Loader2, AlertTriangle, Clock, FileText, ArrowRight,
} from 'lucide-react';

type Inspection = {
  id: string;
  title: string;
  firm_name: string;
  fei_number: string;
  establishment_type: string;
  status: string;
  created_by: string;
  assigned_to: string | null;
  creator_name: string;
  assignee_name: string | null;
  district_office: string;
  inspection_start: string | null;
  inspection_end: string | null;
  created_at: string;
  updated_at: string;
  /** Present on list rows from DB; used for FDA 483→EIR vs legacy badge. */
  metadata_json?: string | null;
};

function isFdaWorkflowRow(metadataJson?: string | null): boolean {
  if (!metadataJson) return false;
  try {
    const m = JSON.parse(metadataJson) as { fda_sequenced_workflow?: boolean; fda_pipeline?: boolean };
    return Boolean(m.fda_sequenced_workflow || m.fda_pipeline);
  } catch {
    return false;
  }
}

type Investigator = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  fda_position: string;
};

type Profile = {
  id: string;
  role: string;
  first_name: string;
  last_name: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  created: { label: 'Created', color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock },
  assigned: { label: 'Assigned', color: 'text-blue-700', bg: 'bg-blue-100', icon: Users },
  in_progress: { label: 'In Progress', color: 'text-indigo-700', bg: 'bg-indigo-100', icon: FileText },
  draft_completed: { label: 'Draft Completed', color: 'text-amber-700', bg: 'bg-amber-100', icon: ClipboardCheck },
  approved_483: { label: '483 Approved', color: 'text-teal-800', bg: 'bg-teal-100', icon: ClipboardCheck },
  sent_to_firm: { label: '483 Sent to Firm', color: 'text-sky-800', bg: 'bg-sky-100', icon: ArrowRight },
  eir_assigned: { label: 'EIR Assigned', color: 'text-cyan-800', bg: 'bg-cyan-100', icon: Users },
  eir_drafting: { label: 'EIR Drafting', color: 'text-blue-800', bg: 'bg-blue-50', icon: FileText },
  eir_submitted: { label: 'EIR Submitted', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: ArrowRight },
  under_review: { label: 'Under Review', color: 'text-purple-700', bg: 'bg-purple-100', icon: Eye },
  approved: { label: 'Approved', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
  eir_approved: { label: 'EIR Approved', color: 'text-green-800', bg: 'bg-green-100', icon: CheckCircle2 },
  rework_required: { label: 'Rework Required', color: 'text-red-700', bg: 'bg-red-100', icon: RotateCcw },
  rejected: { label: 'Rejected', color: 'text-red-800', bg: 'bg-red-200', icon: XCircle },
  closed: { label: 'Closed', color: 'text-gray-800', bg: 'bg-gray-200', icon: CheckCircle2 },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.created;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

export default function WorkflowPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [investigators, setInvestigators] = useState<Investigator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [newInspection, setNewInspection] = useState({
    title: '', firmName: '', feiNumber: '', establishmentType: '', districtOffice: '',
    inspectionStart: '', inspectionEnd: '',
  });

  const isSupervisor = profile?.role === 'supervisor';

  const loadData = useCallback(async () => {
    try {
      const [profileRes, inspRes] = await Promise.all([
        fetch('/api/profile', { credentials: 'include' }),
        fetch('/api/inspections', { credentials: 'include' }),
      ]);
      if (profileRes.ok) {
        const pData = await profileRes.json();
        setProfile(pData.profile);
      }
      if (inspRes.ok) {
        const iData = await inspRes.json();
        setInspections(iData.inspections || []);
      }
      const invRes = await fetch('/api/users/investigators', { credentials: 'include' });
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvestigators(invData.investigators || []);
      }
    } catch (err) {
      console.error('Failed to load workflow data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = inspections.filter(i => {
    const matchesSearch = !search || i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.firm_name.toLowerCase().includes(search.toLowerCase()) || i.fei_number.includes(search);
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = inspections.reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {});

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newInspection),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewInspection({ title: '', firmName: '', feiNumber: '', establishmentType: '', districtOffice: '', inspectionStart: '', inspectionEnd: '' });
        await loadData();
        queryClient.invalidateQueries({ queryKey: dashboardPublishStatsQueryKey });
      }
    } finally { setCreating(false); }
  }

  async function handleAssign(inspectionId: string, investigatorId: string) {
    setAssigning(true);
    try {
      const res = await fetch(`/api/inspections/${inspectionId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assignedTo: investigatorId }),
      });
      if (res.ok) {
        setShowAssignModal(null);
        await loadData();
        queryClient.invalidateQueries({ queryKey: dashboardPublishStatsQueryKey });
      }
    } finally { setAssigning(false); }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isSupervisor ? 'Inspection Assignments' : 'My Work List'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isSupervisor
              ? 'Create assignments, assign investigators, and review inspection packages. New assignments use the FDA 483→EIR sequence unless opted out at creation.'
              : 'View assigned inspections and track progress. Rows marked 483→EIR follow supervisor approval of the 483, firm notification, then EIR drafting.'}
          </p>
        </div>
        {isSupervisor && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-navy-800 transition-colors"
          >
            <Plus className="h-4 w-4" /> Create Assignment
          </button>
        )}
      </div>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(STATUS_CONFIG).filter(([k]) => statusCounts[k]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
              className={`rounded-xl border p-3 text-left transition-all ${statusFilter === key ? 'border-navy-400 ring-2 ring-navy-200' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className="flex items-center gap-2">
                <div className={`rounded-lg p-1.5 ${cfg.bg}`}><Icon className={`h-4 w-4 ${cfg.color}`} /></div>
                <span className="text-xl font-bold text-gray-900">{statusCounts[key]}</span>
              </div>
              <p className="mt-1 text-xs font-medium text-gray-500">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, firm, or FEI..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-4 pr-10 text-sm focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>
      </div>

      {/* Inspections table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-16">
          <AlertTriangle className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            {inspections.length === 0 ? 'No inspections yet' : 'No inspections match your filters'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Inspection</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Firm / FEI</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Workflow</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Assigned To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Updated</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(insp => (
                <tr key={insp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{insp.title}</p>
                    <p className="text-xs text-gray-500">by {insp.creator_name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{insp.firm_name || '—'}</p>
                    <p className="text-xs text-gray-500">{insp.fei_number || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    {isFdaWorkflowRow(insp.metadata_json) ? (
                      <span className="inline-flex rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-900">
                        483→EIR
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Standard</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={insp.status} /></td>
                  <td className="px-4 py-3 text-sm text-gray-700">{insp.assignee_name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(insp.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isSupervisor && insp.status === 'created' && (
                        <button
                          onClick={() => setShowAssignModal(insp.id)}
                          className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          Assign
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/workflow/${insp.id}`)}
                        className="rounded-md bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-navy-100 transition-colors"
                      >
                        {isSupervisor && ['eir_submitted', 'under_review'].includes(insp.status)
                          ? 'Review'
                          : !isSupervisor && ['approved', 'eir_approved', 'closed'].includes(insp.status)
                            ? 'View final document'
                            : 'View'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create Inspection Assignment</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input required value={newInspection.title} onChange={e => setNewInspection(p => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none" placeholder="e.g., Q1 2026 Routine Inspection" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name *</label>
                  <input required value={newInspection.firmName} onChange={e => setNewInspection(p => ({ ...p, firmName: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FEI Number</label>
                  <input value={newInspection.feiNumber} onChange={e => setNewInspection(p => ({ ...p, feiNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Establishment Type</label>
                  <select value={newInspection.establishmentType} onChange={e => setNewInspection(p => ({ ...p, establishmentType: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none bg-white">
                    <option value="">Select...</option>
                    <option value="pharmaceutical_manufacturer">Pharmaceutical</option>
                    <option value="food_facility">Food Facility</option>
                    <option value="medical_device">Medical Device</option>
                    <option value="cosmetics">Cosmetics</option>
                    <option value="dietary_supplement">Dietary Supplement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District Office</label>
                  <input value={newInspection.districtOffice} onChange={e => setNewInspection(p => ({ ...p, districtOffice: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={newInspection.inspectionStart} onChange={e => setNewInspection(p => ({ ...p, inspectionStart: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={newInspection.inspectionEnd} onChange={e => setNewInspection(p => ({ ...p, inspectionEnd: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={creating} className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Assign Investigator</h2>
            <div className="space-y-2">
              {investigators.map(inv => (
                <button
                  key={inv.id}
                  onClick={() => handleAssign(showAssignModal, inv.id)}
                  disabled={assigning}
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-navy-300 hover:bg-navy-50 transition-colors disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 text-sm font-bold text-navy-700">
                    {inv.first_name[0]}{inv.last_name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{inv.first_name} {inv.last_name}</p>
                    <p className="text-xs text-gray-500">{inv.fda_position || inv.email}</p>
                  </div>
                </button>
              ))}
              {investigators.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-500">No investigators found</p>
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowAssignModal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
