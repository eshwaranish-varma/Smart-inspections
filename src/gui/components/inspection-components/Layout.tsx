"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  FolderOpen,
  Settings,
  Shield,
  BookOpen,
  History,
  LogOut,
  Menu,
  ClipboardCheck,
  LineChart,
} from 'lucide-react';
import ProfileMenu from "@/components/profile/ProfileMenu";
import NotificationBell from "@/components/layout/NotificationBell";

const navItems = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/workflow', label: 'eNSpect Workflow', icon: ClipboardCheck },
  { to: '/observations', label: 'Title 21 CFR', icon: BarChart3 },
  { to: '/evaluation', label: 'AI Evaluation', icon: LineChart },
  { to: '/library', label: 'Document Library', icon: FolderOpen },
  { to: '/references', label: 'References', icon: BookOpen },
  { to: '/audit-trail', label: 'Audit Trail', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
];

type DashboardProfile = {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  fda_position?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
};

export default function Layout() {
  const location = useLocation();
  const router = useRouter();
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const pageTitle = navItems.find((n) => location.pathname.startsWith(n.to))?.label ?? 'Smart Inspections';

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          profile?: DashboardProfile;
        };
        if (!response.ok) {
          console.warn(
            "Profile load failed:",
            response.status,
            data.error || response.statusText
          );
          if (active) setProfile(null);
          return;
        }

        if (active) {
          setProfile(data.profile);
        }
      } catch (error) {
        console.warn("Failed to load dashboard profile:", error);
      } finally {
        if (active) {
          setLoadingProfile(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) {
        setIsMobileSidebarOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.replace("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  function handleSidebarToggle() {
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen((current) => !current);
      return;
    }

    setIsSidebarOpen((current) => !current);
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {isMobileSidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/35 md:hidden"
          aria-label="Close sidebar overlay"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-gray-200 bg-white shadow-sm transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-60" : "w-[72px]",
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className={`flex border-b border-gray-100 px-4 py-5 ${isSidebarOpen ? "items-center gap-3" : "justify-center"}`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#003366]">
            <Shield className="h-5 w-5 text-white" />
          </div>
          {isSidebarOpen ? (
            <div>
              <h1 className="text-sm font-bold text-gray-900">Smart Inspections</h1>
              <p className="text-[11px] leading-tight text-gray-400">AI-Assisted FDA 483 Drafting</p>
            </div>
          ) : null}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={!isSidebarOpen ? label : undefined}
              onClick={() => setIsMobileSidebarOpen(false)}
              className={({ isActive }) =>
                `flex rounded-lg px-3 py-2.5 text-sm transition-all duration-300 ${
                  isSidebarOpen ? 'items-center gap-3' : 'items-center justify-center'
                } ${
                  isActive
                    ? 'bg-navy-50 font-medium text-navy-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {isSidebarOpen ? <span className="truncate">{label}</span> : null}
            </NavLink>
          ))}
        </nav>

        <div className={`border-t border-gray-100 px-3 py-4 ${isSidebarOpen ? "" : "flex justify-center"}`}>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title={!isSidebarOpen ? "Logout" : undefined}
            className={`rounded-lg border border-red-200 bg-white text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70 ${
              isSidebarOpen
                ? "flex w-full items-center justify-center gap-2 px-3 py-2"
                : "inline-flex h-11 w-11 items-center justify-center"
            }`}
          >
            <LogOut className="h-4 w-4" />
            {isSidebarOpen ? (loggingOut ? "Logging out..." : "Logout") : null}
          </button>
        </div>
      </aside>

      <div className={`flex flex-1 flex-col transition-[padding] duration-300 ease-in-out ${isSidebarOpen ? "md:pl-60" : "md:pl-[72px]"}`}>
        <header className="sticky top-0 z-20 flex min-h-[92px] items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={handleSidebarToggle}
              className="mr-2 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-semibold text-gray-900">{pageTitle}</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">AI-Assisted FDA 483 Drafting</span>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <ProfileMenu
              profile={profile}
              loading={loadingProfile}
              onProfileUpdated={setProfile}
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


