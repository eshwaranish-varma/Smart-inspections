"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  BookOpen,
  Library,
  Settings,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inspections", label: "Inspections", icon: ClipboardList },
  { href: "/documents/483", label: "Form FDA 483", icon: FileText },
  { href: "/documents/eir", label: "EIR Documents", icon: BookOpen, badge: "Phase 2" },
  { href: "/references", label: "Regulatory References", icon: Library },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, activeInspectionId } = useAppStore();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
        <Shield className="h-7 w-7 text-primary" />
        <span className="font-mono text-xs font-semibold uppercase tracking-widest text-text-primary">
          Smart Inspections
        </span>
      </div>

      <div className="border-b border-border px-4 py-3">
        <p className="font-sans text-sm font-medium text-text-primary">{currentUser.name}</p>
        <p className="font-mono text-[10px] text-text-secondary">
          Badge #{currentUser.badgeNumber}
        </p>
        <p className="font-mono text-[10px] text-text-muted">{currentUser.districtOffice}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mb-0.5 flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary-muted text-primary glow-primary"
                  : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-[9px] text-accent">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-4 py-3">
        {activeInspectionId && (
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
            <span className="font-mono text-[10px] text-accent">
              Active: {activeInspectionId}
            </span>
          </div>
        )}
        <button
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-text-muted transition-colors hover:text-danger"
          aria-label="Logout"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
