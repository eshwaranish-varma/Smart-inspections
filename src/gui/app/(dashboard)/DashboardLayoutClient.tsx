"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
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

function needsInspectionAppProviders(pathname: string): boolean {
  if (pathname === "/workflow" || pathname.startsWith("/workflow/")) {
    return false;
  }
  if (pathname.startsWith("/document/483/")) {
    return true;
  }
  if (pathname.startsWith("/evaluation")) {
    return true;
  }
  return INSPECTION_APP_ROUTES.has(pathname);
}

/** Same routes that previously mounted `InspectionLayout` (profile gate lived there). */
function needsProfileSessionCheck(pathname: string): boolean {
  if (pathname.startsWith("/document/483/")) {
    return false;
  }
  if (pathname.startsWith("/evaluation")) {
    return true;
  }
  return INSPECTION_APP_ROUTES.has(pathname);
}

function wrapPageTitle(pathname: string): string {
  if (pathname === "/dashboard") {
    return "Dashboard";
  }
  return (
    pathname
      .split("/")
      .filter(Boolean)
      .pop()
      ?.replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase()) ?? "Smart Inspections"
  );
}

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const pageTitle = wrapPageTitle(pathname ?? "");

  const path = pathname ?? "";
  let mainChildren: ReactNode = children;
  if (needsInspectionAppProviders(path)) {
    const isDocument483 = path.startsWith("/document/483/");
    mainChildren = (
      <InspectionAppProviders pathname={path} params={params}>
        <div
          className={
            isDocument483
              ? "inspection-app min-h-full bg-gray-50 dark:bg-slate-950"
              : "inspection-app min-h-full"
          }
        >
          {children}
        </div>
      </InspectionAppProviders>
    );
  }

  useEffect(() => {
    if (!needsProfileSessionCheck(pathname ?? "")) {
      return;
    }

    let active = true;

    async function verifySession() {
      try {
        const response = await fetch("/api/profile", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (response.status === 401 && active) {
          router.replace("/login");
        }
      } catch {
        /* non-fatal */
      }
    }

    verifySession();

    return () => {
      active = false;
    };
  }, [router, pathname]);

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

  return (
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
          "flex min-h-screen min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-out",
          sidebarCollapsed ? "md:pl-[72px]" : "md:pl-60",
        ].join(" ")}
      >
        <Navbar title={pageTitle} onMenuClick={handleMenuClick} />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 md:p-8">
          <div className="mx-auto w-full max-w-[1600px] flex-1">{mainChildren}</div>
        </main>
      </div>
    </div>
  );
}
