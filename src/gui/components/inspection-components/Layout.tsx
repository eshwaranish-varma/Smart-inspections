"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  BarChart3,
  FolderOpen,
  Settings,
  Shield,
  Bell,
  BookOpen,
  History,
  LogOut,
} from 'lucide-react';
import ProfileMenu from "@/components/profile/ProfileMenu";

const navItems = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/new-inspection', label: 'New Inspection', icon: FilePlus },
  { to: '/observations', label: 'CFR Citations', icon: BarChart3 },
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

  const pageTitle = navItems.find((n) => location.pathname.startsWith(n.to))?.label ?? 'Smart Inspections';
  const displayName = useMemo(() => {
    if (!profile) return "Authenticated User";
    const name = `${profile.first_name} ${profile.last_name}`.trim();
    return name || profile.email;
  }, [profile]);
  const displayInitials = useMemo(() => {
    const source = displayName.split(" ").filter(Boolean).slice(0, 2);
    return source.map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
  }, [displayName]);
  const locationSummary = useMemo(() => {
    const segments = [
      profile?.address,
      profile?.city,
      profile?.state,
      profile?.country,
      profile?.zip_code,
    ].filter((value) => value && value.trim().length > 0);
    return segments.length > 0 ? segments.join(", ") : "Address not provided";
  }, [profile]);

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

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to load profile.");
        }

        if (active) {
          setProfile(data.profile);
        }
      } catch (error) {
        console.error("Failed to load dashboard profile:", error);
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

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#003366]">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Smart Inspections</h1>
            <p className="text-[11px] leading-tight text-gray-400">AI-Assisted FDA 483 Drafting</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-navy-50 font-medium text-navy-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-100 px-5 py-4">
          <div className="rounded-xl border border-navy-100 bg-gradient-to-br from-slate-50 to-cyan-50 p-3 shadow-sm">
            <p className="text-xs font-semibold text-gray-900">
              {loadingProfile ? "Loading profile..." : displayName}
            </p>
            <p className="mt-1 truncate text-[11px] text-gray-600">
              {profile?.email ?? "Signed-in dashboard session"}
            </p>
            <p className="mt-1 text-[11px] font-medium text-navy-700">
              {profile?.fda_position ?? "FDA Inspector"}
            </p>
            <div className="mt-3 space-y-1.5 rounded-lg bg-white/80 p-2.5 text-[11px] text-gray-600 ring-1 ring-inset ring-white">
              <p>
                <span className="font-semibold text-gray-800">Phone:</span>{" "}
                {profile?.phone?.trim() || "Not provided"}
              </p>
              <p>
                <span className="font-semibold text-gray-800">Address:</span>{" "}
                {locationSummary}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-400">v1.0.0 — DAEN Capstone</p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col pl-64">
        <header className="sticky top-0 z-20 flex min-h-[92px] items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-gray-900">{pageTitle}</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">AI-Assisted FDA 483 Drafting</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
              <Bell className="h-5 w-5" />
            </button>
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


