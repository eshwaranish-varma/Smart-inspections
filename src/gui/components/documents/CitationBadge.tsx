"use client";

import { cn } from "@/lib/utils";

interface CitationBadgeProps {
  citation: {
    part: string;
    section: string;
    title: string;
    fullCitation: string;
  };
  onClick?: () => void;
}

export default function CitationBadge({ citation, onClick }: CitationBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={citation.title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-muted/30 px-2.5 py-0.5",
        "text-xs font-mono text-primary",
        "border-l-[2px] border-l-primary",
        "transition-colors hover:bg-primary-muted/50",
        onClick && "cursor-pointer",
        !onClick && "cursor-default"
      )}
    >
      21 CFR §&nbsp;{citation.part}.{citation.section}
    </button>
  );
}
