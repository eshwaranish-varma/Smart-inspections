"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import InspectionLayout from "@/components/inspection-components/Layout";
import InspectionAppProviders from "@/components/providers/InspectionAppProviders";
import { useAppStore } from "@/lib/store";

const INSPECTION_APP_ROUTES = new Set([
  "/dashboard",
  "/observations",
  "/library",
  "/references",
  "/audit-trail",
  "/settings",
]);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isInspectionDocumentRoute = pathname.startsWith("/document/483/");
  /** Workflow is rendered as normal layout children so the page always mounts (Outlet pattern skipped). */
  const isWorkflowRoute = pathname === "/workflow" || pathname.startsWith("/workflow/");
  const isEvaluationRoute = pathname.startsWith("/evaluation");
  const isInspectionAppRoute =
    !isWorkflowRoute &&
    (INSPECTION_APP_ROUTES.has(pathname) ||
      isInspectionDocumentRoute ||
      isEvaluationRoute);
  const pageTitle =
    pathname === "/dashboard"
      ? "Dashboard"
      : pathname
          .split("/")
          .filter(Boolean)
          .pop()
          ?.replace(/-/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase()) ?? "Smart Inspections";

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) {
        setMobileSidebarOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function handleMenuClick() {
    if (window.innerWidth < 768) {
      setMobileSidebarOpen((current) => !current);
      return;
    }

    toggleSidebar();
  }

  let content: ReactNode;
  if (isInspectionDocumentRoute) {
    content = (
      <InspectionAppProviders pathname={pathname} params={params}>
        <div className="inspection-app min-h-screen bg-gray-50">{children}</div>
      </InspectionAppProviders>
    );
  } else if (isInspectionAppRoute) {
    content = (
      <InspectionAppProviders pathname={pathname} params={params} outlet={children}>
        <div className="inspection-app">
          <InspectionLayout>{children}</InspectionLayout>
        </div>
      </InspectionAppProviders>
    );
  } else {
    content = (
      <div className="flex min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
        {mobileSidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm md:hidden"
            aria-label="Close sidebar overlay"
            onClick={() => setMobileSidebarOpen(false)}
          />
        ) : null}

        <Sidebar
          isOpen={!sidebarCollapsed}
          isMobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <div
          className={[
            "flex min-h-screen flex-1 flex-col transition-[padding] duration-300 ease-out",
            sidebarCollapsed ? "md:pl-[72px]" : "md:pl-60",
          ].join(" ")}
        >
          <Navbar title={pageTitle} onMenuClick={handleMenuClick} />
          <main className="flex-1 p-6 md:p-8">
            <div className="mx-auto max-w-[1600px]">{children}</div>
          </main>
        </div>
      </div>
    );
  }

  return content;
}
