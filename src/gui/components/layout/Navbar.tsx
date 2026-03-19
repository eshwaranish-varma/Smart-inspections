"use client";

import { Bell, Menu, Search } from "lucide-react";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default function Navbar({
  title,
  onMenuClick,
}: {
  title: string;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90">
      <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 py-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-slate-700 shadow-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-md dark:border-white/10 dark:bg-slate-800 dark:text-slate-100"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-900 dark:text-white">{title}</p>
            <p className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">
              AI-Assisted FDA 483 Drafting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search inspections, documents, references..."
              className="h-11 w-80 rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-navy-500 focus:ring-2 focus:ring-navy-100 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-navy-900/40"
            />
          </div>

          <button
            type="button"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-slate-600 shadow-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-md dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-amber-500" />
          </button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
