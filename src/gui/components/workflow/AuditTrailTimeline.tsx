"use client";

import { cn, formatDateTime } from "@/lib/utils";
import { useState } from "react";

type EventType = "create" | "edit" | "sign" | "publish" | "review";

interface AuditEvent {
  id: string;
  timestamp: Date;
  actorName: string;
  action: string;
  type: EventType;
  details: Record<string, unknown>;
}

interface AuditTrailTimelineProps {
  events: AuditEvent[];
}

const dotColors: Record<EventType, string> = {
  create: "bg-blue-500",
  edit: "bg-amber-500",
  sign: "bg-success",
  publish: "bg-stamp-red",
  review: "bg-primary",
};

const badgeColors: Record<EventType, string> = {
  create: "bg-blue-500/10 text-blue-500",
  edit: "bg-amber-500/10 text-amber-500",
  sign: "bg-success/10 text-success",
  publish: "bg-stamp-red/10 text-stamp-red",
  review: "bg-primary/10 text-primary",
};

export default function AuditTrailTimeline({ events }: AuditTrailTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="relative space-y-0">
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1;
        const isExpanded = expandedId === event.id;
        const hasDetails = Object.keys(event.details).length > 0;

        return (
          <div key={event.id} className="relative flex gap-4 pb-6">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "z-10 h-3 w-3 shrink-0 rounded-full ring-4 ring-background",
                  dotColors[event.type]
                )}
              />
              {!isLast && (
                <div className="w-px flex-1 bg-border" />
              )}
            </div>

            <div className="-mt-0.5 flex-1 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-text-muted">
                  {formatDateTime(event.timestamp)}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                    badgeColors[event.type]
                  )}
                >
                  {event.type}
                </span>
              </div>

              <p className="mt-1 text-sm text-text-primary">
                <span className="font-medium">{event.actorName}</span>{" "}
                <span className="text-text-secondary">{event.action}</span>
              </p>

              {hasDetails && (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : event.id)
                  }
                  className="mt-1 text-xs font-medium text-primary hover:underline"
                >
                  {isExpanded ? "Hide details" : "Show details"}
                </button>
              )}

              {isExpanded && hasDetails && (
                <div className="mt-2 rounded-md border border-border bg-background p-3">
                  <dl className="space-y-1 text-xs">
                    {Object.entries(event.details).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <dt className="font-mono text-text-muted">{key}:</dt>
                        <dd className="text-text-secondary">
                          {String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
