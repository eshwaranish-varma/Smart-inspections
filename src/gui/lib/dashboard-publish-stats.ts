export const dashboardPublishStatsQueryKey = ["dashboard-publish-stats"] as const;

export type DashboardPublishStats = {
  published: number;
  readyToPublish: number;
  total: number;
  /** Inspections in workflow before approval (created → review / rework). */
  activeDrafts: number;
};

export async function fetchDashboardPublishStats(): Promise<DashboardPublishStats> {
  const r = await fetch("/api/dashboard/publish-stats", { credentials: "include", cache: "no-store" });
  if (!r.ok) throw new Error("Failed to load publish stats");
  return r.json();
}
