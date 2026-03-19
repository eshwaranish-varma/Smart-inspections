"use client";

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  FileText,
  PenTool,
  Database,
  ArrowRight,
  FilePlus,
  BarChart3,
  FolderOpen,
  Search,
  Quote,
  X,
} from 'lucide-react';
import { getObservationStats, getHealth, getTopRegulations } from '@/lib/api';

type SourceFilter = 'all' | 'IOM' | 'CFR';

type ReferenceChunk = {
  id: string;
  source: 'IOM' | 'CFR';
  sectionPath: string[];
  title: string;
  text: string;
  pageStart: number;
  pageEnd: number;
};

const REFERENCE_CHUNKS: ReferenceChunk[] = [
  {
    id: 'rc-001',
    source: 'IOM',
    sectionPath: ['Chapter 5', '5.2', '5.2.3'],
    title: 'Inspectional Approach — CGMP Inspections',
    text: "The investigator should evaluate the firm's quality system by examining management responsibilities, resources, design controls, and corrective and preventive actions. The systems-based approach to CGMP inspections allows the investigator to assess whether the firm's manufacturing processes are in a state of control.",
    pageStart: 214,
    pageEnd: 215,
  },
  {
    id: 'rc-002',
    source: 'IOM',
    sectionPath: ['Chapter 5', '5.3', '5.3.1'],
    title: 'Documenting Observations — Form FDA 483',
    text: 'Inspectional observations are documented on Form FDA 483, Inspectional Observations. Each observation should be written clearly and concisely, identifying the requirement not met and the specific conditions observed.',
    pageStart: 238,
    pageEnd: 239,
  },
  {
    id: 'rc-003',
    source: 'IOM',
    sectionPath: ['Chapter 5', '5.3', '5.3.2'],
    title: 'Evidence Collection and Documentation',
    text: 'Investigators must collect and document sufficient evidence to support each inspectional observation. Evidence may include copies of records, photographs, samples, and affidavits.',
    pageStart: 242,
    pageEnd: 243,
  },
  {
    id: 'rc-004',
    source: 'IOM',
    sectionPath: ['Chapter 5', '5.4', '5.4.1'],
    title: 'Discussion of Observations with Management',
    text: "At the conclusion of the inspection, the investigator should discuss the inspectional observations with the firm's most responsible individual or designee. Present each observation on the Form FDA 483 and explain the regulatory basis.",
    pageStart: 256,
    pageEnd: 257,
  },
  {
    id: 'rc-005',
    source: 'CFR',
    sectionPath: ['Title 21', 'Part 211', 'Subpart J', '211.192'],
    title: 'Production Record Review',
    text: 'All drug product production and control records shall be reviewed and approved by the quality control unit to determine compliance with all established, approved written procedures before a batch is released.',
    pageStart: 0,
    pageEnd: 0,
  },
  {
    id: 'rc-006',
    source: 'CFR',
    sectionPath: ['Title 21', 'Part 211', 'Subpart D', '211.67'],
    title: 'Equipment Cleaning and Maintenance',
    text: 'Equipment and utensils shall be cleaned, maintained, and sanitized at appropriate intervals to prevent malfunctions or contamination that would alter drug quality.',
    pageStart: 0,
    pageEnd: 0,
  },
  {
    id: 'rc-007',
    source: 'CFR',
    sectionPath: ['Title 21', 'Part 117', 'Subpart C', '117.135'],
    title: 'Preventive Controls',
    text: 'Preventive controls include process controls, allergen controls, sanitation controls, supply-chain controls, and a recall plan as appropriate to facility and food.',
    pageStart: 0,
    pageEnd: 0,
  },
  {
    id: 'rc-008',
    source: 'CFR',
    sectionPath: ['Title 21', 'Part 820', 'Subpart C', '820.30'],
    title: 'Design Controls',
    text: 'Each manufacturer shall establish and maintain procedures to control the design of the device and ensure design changes are reviewed, verified or validated before implementation.',
    pageStart: 0,
    pageEnd: 0,
  },
];

function StatSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="mb-3 h-10 w-10 rounded-lg bg-gray-100 dark:bg-slate-800" />
      <div className="mb-2 h-8 w-16 rounded bg-gray-100 dark:bg-slate-800" />
      <div className="h-4 w-24 rounded bg-gray-100 dark:bg-slate-800" />
    </div>
  );
}

export default function Dashboard() {
  const [refQuery, setRefQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [selectedReference, setSelectedReference] = useState<ReferenceChunk | null>(null);

  const stats = useQuery({ queryKey: ['observation-stats'], queryFn: getObservationStats });
  const health = useQuery({ queryKey: ['health'], queryFn: getHealth });
  const topRegulations = useQuery({ queryKey: ['top-regulations'], queryFn: () => getTopRegulations(10) });

  const statCards = [
    {
      label: 'Total CFR Citations',
      value: stats.data?.total ?? 0,
      icon: ClipboardList,
    },
    {
      label: 'Published Documents',
      value: '—',
      icon: FileText,
    },
    {
      label: 'Active Drafts',
      value: '—',
      icon: PenTool,
    },
    {
      label: 'KB Status',
      value: health.data?.kb_loaded ? 'Loaded' : 'Offline',
      icon: Database,
    },
  ];

  const quickLinks = [
    {
      to: '/new-inspection',
      title: 'New Inspection',
      description: 'Draft FDA 483 observations from your inspection notes using AI.',
      icon: FilePlus,
    },
    {
      to: '/observations',
      title: 'Browse Observations',
      description: 'Explore and search the FY2025 inspection observations dataset.',
      icon: BarChart3,
    },
    {
      to: '/library',
      title: 'Document Library',
      description: 'View, manage, and export your saved inspection documents.',
      icon: FolderOpen,
    },
  ];

  const isLoading = stats.isLoading || health.isLoading;
  const isError = stats.isError || health.isError;

  const filteredReferences = useMemo(() => {
    return REFERENCE_CHUNKS.filter((chunk) => {
      if (sourceFilter !== 'all' && chunk.source !== sourceFilter) return false;
      if (!refQuery.trim()) return true;
      const q = refQuery.toLowerCase();
      return (
        chunk.title.toLowerCase().includes(q) ||
        chunk.text.toLowerCase().includes(q) ||
        chunk.sectionPath.join(' ').toLowerCase().includes(q)
      );
    });
  }, [refQuery, sourceFilter]);

  return (
    <div className="space-y-8 md:space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Welcome to Smart Inspections — your AI-assisted FDA 483 drafting workspace.
          </p>
        </div>
        <Link
          to="/new-inspection"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0B1F3A] via-[#123d72] to-[#2F7A7A] px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
        >
          <FilePlus className="h-4 w-4" />
          Start New Inspection Draft
        </Link>
      </div>

      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-500/20 dark:bg-red-950/30">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            Unable to reach the backend API. Please ensure the server is running.
          </p>
          <button
            onClick={() => { stats.refetch(); health.refetch(); }}
            className="mt-3 text-sm font-medium text-red-600 underline hover:text-red-700 dark:text-red-300 dark:hover:text-red-200"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
            : statCards.map(({ label, value, icon: Icon }) => (
                <div key={label} className="card-polish p-6 dark:border-white/10 dark:bg-slate-900">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 dark:bg-slate-800">
                    <Icon className="h-5 w-5 text-navy-600" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{label}</p>
                </div>
              ))}
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Quick Links</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {quickLinks.map(({ to, title, description, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-slate-900"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 transition-colors group-hover:bg-navy-100 dark:bg-slate-800 dark:group-hover:bg-slate-700">
                <Icon className="h-5 w-5 text-navy-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
              <p className="mt-1 flex-1 text-sm text-gray-500 dark:text-slate-400">{description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-navy-600">
                Open <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Regulatory References</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Browse and search IOM, CFR, and FDA guidance</p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={refQuery}
              onChange={(e) => setRefQuery(e.target.value)}
              placeholder="Search references..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'IOM', 'CFR'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSourceFilter(filter)}
                className={`rounded px-3 py-2 text-xs font-medium ${
                  sourceFilter === filter
                    ? 'bg-navy-700 text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {filter === 'all' ? 'All' : filter}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3">
          {filteredReferences.map((chunk) => (
            <button
              key={chunk.id}
              type="button"
              onClick={() => setSelectedReference(chunk)}
              className="rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-navy-300 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${chunk.source === 'IOM' ? 'bg-navy-100 text-navy-700' : 'bg-green-100 text-green-700'}`}>
                  {chunk.source}
                </span>
                <span className="text-xs text-gray-500">{chunk.sectionPath.join(' > ')}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-900">{chunk.title}</p>
              <p className="mt-1 text-sm text-gray-600">
                {chunk.text.length > 220 ? `${chunk.text.slice(0, 220)}...` : chunk.text}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-navy-700">
                  <Quote className="h-3 w-3" />
                  Cite in Observation
                </span>
                {chunk.pageStart > 0 && (
                  <span className="text-xs text-gray-500">pp. {chunk.pageStart}–{chunk.pageEnd}</span>
                )}
              </div>
            </button>
          ))}
          {filteredReferences.length === 0 && (
            <div className="rounded-lg border border-gray-200 p-5 text-sm text-gray-500">
              No references match your search.
            </div>
          )}
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-900">Top 10 Regulations (IOM PDF)</h3>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {topRegulations.isLoading
              ? Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="h-10 animate-pulse rounded bg-gray-100" />
                ))
              : (topRegulations.data ?? []).map((item) => (
                  <div key={item.citation} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm">
                    <span className="font-medium text-gray-800">{item.citation}</span>
                    <span className="text-xs text-gray-500">{item.count}</span>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {selectedReference && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          onClick={() => setSelectedReference(null)}
        >
          <div
            className="w-full max-w-3xl rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${selectedReference.source === 'IOM' ? 'bg-navy-100 text-navy-700' : 'bg-green-100 text-green-700'}`}>
                    {selectedReference.source}
                  </span>
                  <span className="text-xs text-gray-500">
                    {selectedReference.sectionPath.join(' > ')}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-gray-900">
                  {selectedReference.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReference(null)}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close reference popup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
              <div className="mb-4 inline-flex items-center gap-1 rounded bg-navy-50 px-2 py-1 text-xs font-medium text-navy-700">
                <Quote className="h-3 w-3" />
                Cite in Observation
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {selectedReference.text}
              </p>
              {selectedReference.pageStart > 0 && (
                <p className="mt-4 text-xs text-gray-500">
                  Pages {selectedReference.pageStart}–{selectedReference.pageEnd}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


