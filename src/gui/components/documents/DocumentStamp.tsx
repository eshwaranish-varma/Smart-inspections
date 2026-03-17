"use client";

import { cn } from "@/lib/utils";

type StampStatus = "draft" | "under_review" | "approved" | "published";

interface DocumentStampProps {
  status: StampStatus;
}

const stampConfig: Record<StampStatus, { label: string; color: string }> = {
  draft: { label: "DRAFT", color: "#CC2200" },
  under_review: { label: "UNDER REVIEW", color: "#F5A623" },
  approved: { label: "APPROVED", color: "#1A6EFF" },
  published: { label: "PUBLISHED", color: "#22C55E" },
};

export default function DocumentStamp({ status }: DocumentStampProps) {
  const { label, color } = stampConfig[status];

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center justify-center"
      )}
      aria-hidden="true"
    >
      <svg
        width="320"
        height="120"
        viewBox="0 0 320 120"
        className="opacity-15"
        style={{ transform: "rotate(-30deg)" }}
      >
        <rect
          x="4"
          y="4"
          width="312"
          height="112"
          rx="8"
          ry="8"
          fill="none"
          stroke={color}
          strokeWidth="4"
        />
        <text
          x="160"
          y="68"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontWeight="700"
          fontSize={label.length > 10 ? "28" : "36"}
          fontFamily="IBM Plex Sans, system-ui, sans-serif"
          letterSpacing="4"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
