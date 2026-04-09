"use client";

import { ReactNode } from "react";
import { RouterCompatProvider } from "@/lib/react-router-dom-compat";

type InspectionAppProvidersProps = {
  pathname: string;
  params: Record<string, string | string[] | undefined>;
  outlet?: ReactNode;
  children: ReactNode;
};

/** QueryClientProvider lives in (dashboard)/layout.tsx so workflow and inspection routes share one client. */
export default function InspectionAppProviders({
  pathname,
  params,
  outlet,
  children,
}: InspectionAppProvidersProps) {
  return (
    <RouterCompatProvider pathname={pathname} params={params} outlet={outlet}>
      {children}
    </RouterCompatProvider>
  );
}
