"use client";

import { cn } from "@/lib/utils";

type ItemStatus = "not_started" | "in_progress" | "completed";

interface ChecklistItem {
  id: string;
  label: string;
  status: ItemStatus;
  notes?: string;
}

interface ChecklistPanelProps {
  items: ChecklistItem[];
  onToggle: (id: string) => void;
}

function StatusIcon({ status }: { status: ItemStatus }) {
  if (status === "completed") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" fill="var(--success)" />
        <path
          d="M6 10l2.5 2.5L14 7.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (status === "in_progress") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="var(--accent)" strokeWidth="2" />
        <path
          d="M10 10 L10 1 A9 9 0 0 1 19 10 Z"
          fill="var(--accent)"
          opacity="0.5"
        />
      </svg>
    );
  }

  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle
        cx="10"
        cy="10"
        r="9"
        stroke="var(--text-muted)"
        strokeWidth="2"
      />
    </svg>
  );
}

const statusLabel: Record<ItemStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

const statusBadge: Record<ItemStatus, string> = {
  not_started: "bg-text-muted/10 text-text-muted",
  in_progress: "bg-accent/10 text-accent",
  completed: "bg-success/10 text-success",
};

export default function ChecklistPanel({ items, onToggle }: ChecklistPanelProps) {
  const completed = items.filter((i) => i.status === "completed").length;
  const pct = items.length > 0 ? (completed / items.length) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-text-primary">
            {completed} of {items.length} checks passed
          </span>
          <span className="font-mono text-xs text-text-muted">
            {Math.round(pct)}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-success transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-background"
            >
              <div className="mt-0.5 shrink-0">
                <StatusIcon status={item.status} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-primary">{item.label}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      statusBadge[item.status]
                    )}
                  >
                    {statusLabel[item.status]}
                  </span>
                </div>
                {item.notes && (
                  <p className="mt-0.5 text-xs text-text-muted">{item.notes}</p>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
