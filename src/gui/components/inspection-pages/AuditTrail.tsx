"use client";

import { useState, useMemo } from 'react';
import { History, Filter } from 'lucide-react';
import AuditTrailTimeline from '@/components/inspection-components/workflow/AuditTrailTimeline';
import { sampleAuditTrail } from '@/lib/inspection/mockData';

const ACTION_TYPES = ['All', 'Created', 'Edited', 'Generated', 'Published', 'Deleted'] as const;

export default function AuditTrail() {
  const [actionFilter, setActionFilter] = useState<string>('All');

  const filteredEntries = useMemo(() => {
    if (actionFilter === 'All') return sampleAuditTrail;
    return sampleAuditTrail.filter(
      (entry) => entry.action.toLowerCase() === actionFilter.toLowerCase(),
    );
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track all actions performed across inspections, documents, and observations.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-gray-400" />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500"
        >
          {ACTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-400">
          {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      {filteredEntries.length > 0 ? (
        <AuditTrailTimeline entries={filteredEntries} />
      ) : (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <History className="h-7 w-7 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No audit entries match this filter.</p>
          <p className="mt-1 text-sm text-gray-400">Try selecting a different action type.</p>
        </div>
      )}
    </div>
  );
}



