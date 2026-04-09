"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import DocumentReviewWorkspace from "@/components/document-review/DocumentReviewWorkspace";

function DocumentReviewInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const pageParam = searchParams.get("page");
  const initialPage = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const highlightParam = searchParams.get("highlight")?.trim() || null;

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/inspections/${id}/evidence-pdf`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/profile`, { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
    ])
      .then(([evData, profileData]) => {
        if (cancelled) return;
        const url = (evData.pdf_url as string | null | undefined)?.trim() || null;
        setPdfUrl(url);
        setRole(profileData?.profile?.role ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-navy-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <Link
          href={`/workflow/${id}`}
          className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Document review workspace</h1>
          <p className="text-sm text-gray-500">Evidence PDF, trace excerpt, comments, and signature</p>
        </div>
      </div>

      <DocumentReviewWorkspace
        inspectionId={id}
        pdfUrl={pdfUrl}
        canSign={role === "supervisor"}
        initialPage={initialPage}
        highlightText={highlightParam}
      />
    </div>
  );
}

export default function DocumentReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-navy-600" />
        </div>
      }
    >
      <DocumentReviewInner />
    </Suspense>
  );
}
