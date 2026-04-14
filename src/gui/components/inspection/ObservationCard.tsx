"use client";

import { GripVertical, Pencil, Trash2, AlertTriangle } from "lucide-react";
import type { DraftObservation } from "@/types/inspection";

interface ObservationCardProps {
  observation: DraftObservation;
  index: number;
  onEdit?: (obs: DraftObservation) => void;
  onDelete?: (id: string) => void;
  isDraggable?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

function confidenceColor(score: number) {
  if (score > 0.8) return "bg-green-500";
  if (score > 0.5) return "bg-yellow-500";
  return "bg-red-500";
}

export default function ObservationCard({
  observation,
  index,
  onEdit,
  onDelete,
  isDraggable,
  dragHandleProps,
}: ObservationCardProps) {
  const raw = observation.confidence_score;
  const pct = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
  const normalizedScore = raw <= 1 ? raw : raw / 100;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {isDraggable && (
            <span
              {...dragHandleProps}
              className="cursor-grab text-gray-400 hover:text-gray-600"
            >
              <GripVertical className="h-5 w-5" />
            </span>
          )}
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Observation {index}:
          </h3>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(observation)}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Edit observation"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(observation.id)}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              aria-label="Delete observation"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <p className="mb-3 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
        {observation.observation_text}
      </p>

      <span className="mb-3 inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
        {observation.cfr_citation}
      </span>

      {observation.evidence_list.length > 0 && (
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-slate-400">
          {observation.evidence_list.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}

      <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
        <span>Confidence</span>
        <span>{pct}%</span>
      </div>
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${confidenceColor(normalizedScore)}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {observation.review_flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {observation.review_flags.map((flag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800"
            >
              <AlertTriangle className="h-3 w-3" />
              {flag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
