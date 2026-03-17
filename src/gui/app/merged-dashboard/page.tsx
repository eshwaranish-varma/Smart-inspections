"use client";

import { useMemo } from "react";

export default function MergedDashboardPage() {
  const targetUrl = useMemo(
    () => process.env.NEXT_PUBLIC_MERGED_DASHBOARD_URL || "http://localhost:5173/dashboard",
    []
  );

  return (
    <div style={{ height: "100vh", width: "100%", background: "#f4f7fa" }}>
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          borderBottom: "1px solid #dbe3ea",
          background: "#ffffff",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0D1B3E" }}>
          Smart Inspections — Unified Dashboard
        </div>
        <a
          href={targetUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 13,
            color: "#028090",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Open 5173 in new tab
        </a>
      </div>
      <iframe
        src={targetUrl}
        title="Merged 5173 Dashboard"
        style={{ width: "100%", height: "calc(100vh - 52px)", border: "none" }}
      />
    </div>
  );
}

