"use client";

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  X,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getObservations, getObservationStats, exportObservations, addObservation } from '@/lib/api';
import type { ObservationStats } from '@/types/inspection';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

export default function Observations() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [estType, setEstType] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [manualEntry, setManualEntry] = useState<Record<string, string>>({});
  const perPage = 20;

  const observations = useQuery({
    queryKey: ['observations', search, page, estType],
    queryFn: () => getObservations({ q: search || undefined, page, per_page: perPage, establishment_type: estType || undefined }),
    placeholderData: (prev) => prev,
  });

  const statsQuery = useQuery({
    queryKey: ['observation-stats'],
    queryFn: getObservationStats,
  });

  const statsData: ObservationStats | undefined = statsQuery.data;
  const items = observations.data?.items ?? [];
  const totalPages = observations.data?.pages ?? 1;
  const totalCount = observations.data?.total ?? 0;

  const columns = useMemo(() => {
    if (items.length === 0) return [];
    return Object.keys(items[0]).slice(0, 8);
  }, [items]);

  const sortedItems = useMemo(() => {
    if (!sortKey) return items;
    return [...items].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [items, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  const chartData = useMemo(
    () => (statsData?.top_citations ?? []).slice(0, 10).map((c) => ({ name: c.citation, count: c.count })),
    [statsData],
  );

  const estTypes = Object.keys(statsData?.by_establishment_type ?? {});

  const handleExport = () => exportObservations(search);

  const handleAddManual = async () => {
    if (Object.values(manualEntry).every((v) => !v.trim())) return;
    await addObservation(manualEntry);
    setShowModal(false);
    setManualEntry({});
    observations.refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Code of Federal Regulations</h1>
        <p className="mt-1 text-sm text-gray-500">Browse, search, and analyze the observations dataset.</p>
      </div>

      {statsQuery.isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : statsData ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Observations</p>
            <p className="text-2xl font-bold text-gray-900">{statsData.total.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Top Citation</p>
            <p className="truncate text-lg font-semibold text-gray-900">
              {statsData.top_citations?.[0]?.citation ?? '—'}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Establishment Types</p>
            <p className="text-2xl font-bold text-gray-900">
              {Object.keys(statsData.by_establishment_type).length}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search observations..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
          />
        </div>
        <select
          value={estType}
          onChange={(e) => { setEstType(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
        >
          <option value="">All Types</option>
          {estTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          Export Filtered
        </button>
        <button
          onClick={() => {
            setManualEntry(columns.reduce((acc, c) => ({ ...acc, [c]: '' }), {} as Record<string, string>));
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy-800"
        >
          <Plus className="h-4 w-4" />
          Add Manual Entry
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    className="cursor-pointer whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                  >
                    <span className="inline-flex items-center gap-1">
                      {col} <SortIcon col={col} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {observations.isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: columns.length || 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={columns.length || 1} className="px-4 py-12 text-center text-gray-400">
                    No observations found.
                  </td>
                </tr>
              ) : (
                sortedItems.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {columns.map((col) => (
                      <td key={col} className="max-w-[240px] truncate whitespace-nowrap px-4 py-3 text-gray-700">
                        {item[col] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          <span>
            Showing page {page} of {totalPages} ({totalCount.toLocaleString()} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-3 w-3" /> Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              Next <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="rounded-lg border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Top 10 CFR Citations</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 120 }}>
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
              <Tooltip />
              <Bar dataKey="count" fill="#003366" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Add Manual Observation</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-80 space-y-3 overflow-y-auto">
              {columns.map((col) => (
                <div key={col}>
                  <label className="mb-1 block text-xs font-medium text-gray-600">{col}</label>
                  <input
                    type="text"
                    value={manualEntry[col] ?? ''}
                    onChange={(e) => setManualEntry((prev) => ({ ...prev, [col]: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
                  />
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddManual}
                className="rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-800"
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


