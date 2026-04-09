"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Home,
  LineChart,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import UserMenu from "@/components/layout/UserMenu";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/workflow", label: "Workflow", icon: ClipboardCheck },
  { href: "/observations", label: "Title 21 CFR", icon: BookOpen },
  { href: "/evaluation", label: "Evaluation", icon: LineChart },
  { href: "/library", label: "Library", icon: FolderOpen },
  { href: "/references", label: "References", icon: FileText },
  { href: "/audit-trail", label: "Audit", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({
  isOpen,
  isMobileOpen,
  onCloseMobile,
}: {
  isOpen: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const { activeInspectionId } = useAppStore();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white/95 shadow-xl backdrop-blur-xl transition-all duration-300 ease-out dark:border-white/10 dark:bg-slate-900/95 md:z-40",
        isOpen ? "w-60" : "w-[72px]",
        isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
      aria-label="Sidebar"
    >
      <div className={cn("flex items-center border-b border-gray-200 px-4 py-5 dark:border-white/10", isOpen ? "gap-3" : "justify-center")}>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0B1F3A] to-[#2F7A7A] text-white shadow-sm">
          <Shield className="h-5 w-5" />
        </div>
        <div className={cn("overflow-hidden transition-all duration-300", isOpen ? "w-auto opacity-100" : "w-0 opacity-0")}>
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">Smart Inspections</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">AI-Assisted FDA 483 Drafting</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              title={!isOpen ? item.label : undefined}
              className={cn(
                "mb-1 flex items-center rounded-xl px-3 py-3 text-sm transition-all duration-300",
                isOpen ? "gap-3" : "justify-center",
                active
                  ? "bg-navy-50 text-navy-700 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              )}
            >
              <Icon className={cn("h-[18px] w-[18px] flex-shrink-0", active ? "text-navy-700 dark:text-cyan-300" : "")} />
              <span className={cn("overflow-hidden whitespace-nowrap transition-all duration-300", isOpen ? "w-auto opacity-100" : "w-0 opacity-0")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-gray-200 px-3 py-4 dark:border-white/10", isOpen ? "space-y-4" : "space-y-3")}>
        {activeInspectionId && (
          <div className={cn("flex items-center rounded-xl bg-amber-50 px-3 py-2 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300", isOpen ? "gap-2" : "justify-center")}>
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
            <span className={cn("font-mono text-[10px]", isOpen ? "block" : "hidden")}>
              Active: {activeInspectionId}
            </span>
          </div>
        )}
        <div className={cn("flex", isOpen ? "justify-start" : "justify-center")}>
          <UserMenu compact align="left" />
        </div>
      </div>
    </aside>
  );
}
