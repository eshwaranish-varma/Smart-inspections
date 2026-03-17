"use client";

import { Bell, Search } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function TopBar() {
  const { currentUser } = useAppStore();

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-surface/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search inspections, documents, references..."
            className="h-8 w-80 rounded border border-border bg-background pl-8 pr-3 font-sans text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          className="relative rounded p-1.5 text-text-secondary transition-colors hover:text-text-primary"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-muted font-mono text-xs font-medium text-primary">
            {currentUser.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <span className="font-mono text-xs text-text-secondary">{currentUser.name}</span>
        </div>
      </div>
    </header>
  );
}
