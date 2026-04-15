"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowNotification } from "@/types/inspection";

type NotificationResponse = {
  notifications: WorkflowNotification[];
  unreadCount: number;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WorkflowNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const unread = useMemo(() => items.filter((item) => !item.is_read), [items]);
  const read = useMemo(() => items.filter((item) => item.is_read), [items]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications", {
        credentials: "include",
        cache: "no-store",
      });
      const data: NotificationResponse = await response.json();
      if (response.ok) {
        setItems(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, {
      method: "POST",
      credentials: "include",
    });
    setItems((current) => current.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
    setUnreadCount((current) => Math.max(0, current - 1));
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", {
      method: "POST",
      credentials: "include",
    });
    setItems((current) => current.map((item) => ({ ...item, is_read: true })));
    setUnreadCount(0);
  };

  const hrefFor = (item: WorkflowNotification) => {
    if (item.inspection_id) return `/workflow/${item.inspection_id}`;
    return "/workflow";
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white text-slate-600 shadow-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-md dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-[360px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Notifications</p>
              <p className="text-xs text-gray-500">Workflow updates and review actions</p>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-medium text-navy-700 hover:text-navy-900"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[460px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-sm text-gray-500">Loading notifications...</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500">No notifications yet.</div>
            ) : (
              <>
                <Section title="Unread" items={unread} onOpen={markRead} hrefFor={hrefFor} />
                <Section title="Read" items={read} onOpen={markRead} hrefFor={hrefFor} muted />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  onOpen,
  hrefFor,
  muted = false,
}: {
  title: string;
  items: WorkflowNotification[];
  onOpen: (id: string) => Promise<void>;
  hrefFor: (item: WorkflowNotification) => string;
  muted?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{title}</div>
      <div className="space-y-1 px-2 pb-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={hrefFor(item)}
            onClick={() => onOpen(item.id)}
            className={cn(
              "block rounded-xl px-3 py-3 transition-colors hover:bg-gray-50",
              muted ? "opacity-80" : "bg-blue-50/40"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-gray-600">{item.message}</p>
              </div>
              {!item.is_read && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />}
            </div>
            <p className="mt-2 text-[11px] text-gray-400">{new Date(item.created_at).toLocaleString()}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
