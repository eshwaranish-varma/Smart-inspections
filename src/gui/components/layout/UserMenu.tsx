"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import ProfileModal from "@/components/profile/ProfileModal";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function UserMenu({
  compact = false,
  align = "right",
}: {
  compact?: boolean;
  align?: "left" | "right";
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAppStore();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = useMemo(() => {
    return currentUser.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((segment) => segment[0]?.toUpperCase() ?? "")
      .join("");
  }, [currentUser.name]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setOpen(false);
      router.replace("/");
      router.refresh();
      setLoggingOut(false);
    }
  }

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white text-slate-800 shadow-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-md dark:border-white/10 dark:bg-slate-800 dark:text-slate-100",
            compact ? "h-11 w-11" : "gap-3 px-3 py-2.5"
          )}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Open user menu"
          title={compact ? currentUser.name : undefined}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-navy-700 to-cyan-600 text-xs font-semibold text-white">
            {initials || <User className="h-4 w-4" />}
          </span>
          {!compact ? <span className="text-sm font-medium">{currentUser.name}</span> : null}
        </button>

        {open ? (
          <div
            className={cn(
              "absolute bottom-full z-50 mb-3 w-44 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-slate-900",
              align === "right" ? "right-0" : "left-0"
            )}
            role="menu"
          >
            <button
              type="button"
              onClick={() => {
                setProfileOpen(true);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              role="menuitem"
            >
              <User className="h-4 w-4" />
              Profile
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-70 dark:hover:bg-red-950/30"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        ) : null}
      </div>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
