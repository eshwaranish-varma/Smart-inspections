"use client";

import { format } from 'date-fns';
import { Clock } from 'lucide-react';

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details?: string;
}

interface AuditTrailTimelineProps {
  entries: AuditEntry[];
}

const ACTION_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  created:   { dot: 'bg-green-500',   bg: 'bg-green-50',   text: 'text-green-700' },
  edited:    { dot: 'bg-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700' },
  generated: { dot: 'bg-purple-500',  bg: 'bg-purple-50',  text: 'text-purple-700' },
  published: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  deleted:   { dot: 'bg-red-500',     bg: 'bg-red-50',     text: 'text-red-700' },
};

const DEFAULT_COLOR = { dot: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-600' };

function getColor(action: string) {
  const key = Object.keys(ACTION_COLORS).find((k) => action.toLowerCase().includes(k));
  return key ? ACTION_COLORS[key] : DEFAULT_COLOR;
}

export default function AuditTrailTimeline({ entries }: AuditTrailTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <Clock className="mb-2 h-8 w-8" />
        <p className="text-sm">No audit trail entries yet.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {entries.map((entry, idx) => {
        const color = getColor(entry.action);
        const isLast = idx === entries.length - 1;
        const ts = new Date(entry.timestamp);

        return (
          <div key={entry.id} className="relative flex gap-4 pb-6">
            {/* Vertical line */}
            {!isLast && (
              <div className="absolute left-[9px] top-5 h-full w-0.5 bg-gray-200" />
            )}

            {/* Dot */}
            <div className={`relative z-10 mt-1 h-[18px] w-[18px] shrink-0 rounded-full border-2 border-white shadow-sm ${color.dot}`} />

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${color.bg} ${color.text}`}>
                  {entry.action}
                </span>
                <span className="text-xs text-gray-400">
                  {format(ts, 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-700">
                <span className="font-medium">{entry.user}</span>
              </p>
              {entry.details && (
                <p className="mt-0.5 text-sm text-gray-500">{entry.details}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type { AuditEntry };


