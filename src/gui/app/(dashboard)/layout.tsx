"use client";

import { useParams, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import InspectionLayout from "@/components/inspection-components/Layout";
import InspectionAppProviders from "@/components/providers/InspectionAppProviders";

const INSPECTION_APP_ROUTES = new Set([
  "/dashboard",
  "/new-inspection",
  "/observations",
  "/library",
  "/references",
  "/audit-trail",
  "/settings",
]);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();

  const isInspectionDocumentRoute = pathname.startsWith("/document/483/");
  const isInspectionAppRoute =
    INSPECTION_APP_ROUTES.has(pathname) || isInspectionDocumentRoute;

  if (isInspectionDocumentRoute) {
    return (
      <InspectionAppProviders pathname={pathname} params={params}>
        <div className="inspection-app min-h-screen bg-gray-50">{children}</div>
      </InspectionAppProviders>
    );
  }

  if (isInspectionAppRoute) {
    return (
      <InspectionAppProviders
        pathname={pathname}
        params={params}
        outlet={children}
      >
        <div className="inspection-app">
          <InspectionLayout />
        </div>
      </InspectionAppProviders>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="ml-60 flex flex-1 flex-col">
        <TopBar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
