"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 as Loader2Icon } from "lucide-react";
import InspectionEvaluationDashboardView from "@/components/evaluation/InspectionEvaluationDashboardView";
import { getInspectionEvaluationDashboard } from "@/lib/api";
import { useWorkflowGuard } from "@/hooks/useWorkflowGuard";
import { canAccessEvaluation } from "@/lib/inspection-workflow-policy";
import type { InspectionEvaluationDashboard } from "@/types/inspection";

export default function InspectionEvaluationDashboardPage() {
  const params = useParams();
  const inspectionId = params.inspectionId as string;
  const { allowed, loading: guardLoading } = useWorkflowGuard(inspectionId, canAccessEvaluation);
  const [data, setData] = useState<InspectionEvaluationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getInspectionEvaluationDashboard(inspectionId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load evaluation metrics.");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inspectionId]);

  if (guardLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2Icon className="h-8 w-8 animate-spin text-navy-600" />
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="flex items-center gap-3">
        <Link
          href="/evaluation"
          className="rounded-lg border border-slate-200 p-2 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Evaluation Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Inspection {inspectionId}</p>
        </div>
      </div>

      <InspectionEvaluationDashboardView inspectionId={inspectionId} data={data} loading={loading} error={error} />
    </div>
  );
}
