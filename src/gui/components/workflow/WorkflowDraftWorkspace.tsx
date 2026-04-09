"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import NewInspection from "@/components/inspection-pages/NewInspection";
import { canAccessDraftWorkspace } from "@/lib/inspection-workflow-policy";
import type { InspectionRecord } from "@/lib/db/inspection-service";

type Profile = { id: string; role: string };

export type WorkflowDraftWorkspaceProps = {
  /** When set (e.g. `/new-inspection?inspectionId=`), path params are not used. */
  inspectionId?: string;
  /** Optional when `inspectionId` is passed from the server page. */
  initialPhase?: "483" | "eir";
};

type GateState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "blocked"; title: string; detail: string; href?: string; hrefLabel?: string };

export default function WorkflowDraftWorkspace({
  inspectionId: inspectionIdProp,
  initialPhase: initialPhaseProp,
}: WorkflowDraftWorkspaceProps = {}) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = inspectionIdProp ?? (params?.id as string | undefined) ?? "";
  const phase: "483" | "eir" =
    initialPhaseProp ?? (searchParams.get("phase") === "eir" ? "eir" : "483");

  const [gate, setGate] = useState<GateState>({ status: "loading" });

  useEffect(() => {
    if (!id.trim()) {
      setGate({
        status: "blocked",
        title: "Missing inspection",
        detail: "No inspection id was provided. Open the assignment from the workflow list.",
        href: "/workflow",
        hrefLabel: "Back to workflow",
      });
      return;
    }

    let cancelled = false;
    const ac = new AbortController();

    (async () => {
      try {
        const [profRes, inspRes] = await Promise.all([
          fetch("/api/profile", { credentials: "include", signal: ac.signal }),
          fetch(`/api/inspections/${id}`, { credentials: "include", cache: "no-store", signal: ac.signal }),
        ]);
        if (cancelled) return;

        if (profRes.status === 401) {
          router.replace("/login");
          return;
        }

        const profile: Profile | null = profRes.ok ? (await profRes.json()).profile : null;
        if (!profile) {
          setGate({
            status: "blocked",
            title: "Could not load profile",
            detail: "Please sign in again.",
            href: "/login",
            hrefLabel: "Sign in",
          });
          return;
        }

        if (profile.role === "supervisor") {
          setGate({
            status: "blocked",
            title: "Supervisor review",
            detail: "Draft editing is for the assigned investigator. Use the inspection overview to review and approve.",
            href: `/workflow/${id}?stay=1`,
            hrefLabel: "Open inspection overview",
          });
          return;
        }

        if (!inspRes.ok) {
          if (inspRes.status === 404) {
            setGate({
              status: "blocked",
              title: "Inspection not found",
              detail: "It may have been removed or you may not have access.",
              href: "/workflow",
              hrefLabel: "Back to workflow",
            });
            return;
          }
          setGate({
            status: "blocked",
            title: "Could not load inspection",
            detail: "Try again from the workflow list.",
            href: "/workflow",
            hrefLabel: "Back to workflow",
          });
          return;
        }

        const data = await inspRes.json();
        if (cancelled) return;

        const inspection = data.inspection as InspectionRecord | undefined;
        if (!inspection) {
          setGate({
            status: "blocked",
            title: "Inspection not found",
            detail: "The server returned no data for this id.",
            href: "/workflow",
            hrefLabel: "Back to workflow",
          });
          return;
        }

        const myId = profile.id?.trim();
        if (
          profile.role === "investigator" &&
          myId &&
          inspection.assigned_to &&
          inspection.assigned_to !== myId
        ) {
          setGate({
            status: "blocked",
            title: "Different assignee",
            detail: "This inspection is assigned to another investigator.",
            href: `/workflow/${id}?stay=1`,
            hrefLabel: "Open inspection overview",
          });
          return;
        }

        const access = canAccessDraftWorkspace(inspection, phase);
        if (!access.ok) {
          setGate({
            status: "blocked",
            title: "Draft workspace unavailable",
            detail: access.reason ?? "This phase is not available for the current workflow status.",
            href: `/workflow/${id}?stay=1`,
            hrefLabel: "Back to inspection overview",
          });
          return;
        }

        if (!cancelled) setGate({ status: "ready" });
      } catch (e: unknown) {
        if (cancelled || (e instanceof Error && e.name === "AbortError")) return;
        setGate({
          status: "blocked",
          title: "Something went wrong",
          detail: e instanceof Error ? e.message : "Please try again.",
          href: "/workflow",
          hrefLabel: "Back to workflow",
        });
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [id, phase, router]);

  if (gate.status === "loading") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-gray-600">
        <Loader2 className="h-8 w-8 animate-spin text-navy-600" />
        <p className="text-sm">Opening drafting workspace…</p>
      </div>
    );
  }

  if (gate.status === "blocked") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900/40 dark:bg-amber-950/30">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{gate.title}</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{gate.detail}</p>
          {gate.href ? (
            <button
              type="button"
              onClick={() => router.push(gate.href!)}
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-navy-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 dark:bg-cyan-700 dark:hover:bg-cyan-600"
            >
              {gate.hrefLabel ?? "Continue"}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-6">
        <button
          type="button"
          onClick={() => router.push(`/workflow/${id}?stay=1`)}
          className="text-sm font-medium text-navy-700 hover:text-navy-900"
        >
          ← Inspection overview
        </button>
      </div>
      <NewInspection forcedInspectionId={id} initialPhase={phase} />
    </div>
  );
}
