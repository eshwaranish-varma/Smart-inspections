import type { ReactNode } from "react";
import DashboardLayoutClient from "./DashboardLayoutClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
