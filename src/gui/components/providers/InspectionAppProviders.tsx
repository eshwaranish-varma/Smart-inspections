"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { RouterCompatProvider } from "@/lib/react-router-dom-compat";

type InspectionAppProvidersProps = {
  pathname: string;
  params: Record<string, string | string[] | undefined>;
  outlet?: ReactNode;
  children: ReactNode;
};

export default function InspectionAppProviders({
  pathname,
  params,
  outlet,
  children,
}: InspectionAppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RouterCompatProvider pathname={pathname} params={params} outlet={outlet}>
        {children}
      </RouterCompatProvider>
    </QueryClientProvider>
  );
}
