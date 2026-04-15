import { Suspense } from "react";
import { redirect } from "next/navigation";
import WorkflowDraftWorkspace from "@/components/workflow/WorkflowDraftWorkspace";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ inspectionId?: string; phase?: string }>;
};

/**
 * Standalone URL: `/new-inspection` → workflow list.
 * Workflow drafting: `/new-inspection?inspectionId=<uuid>&phase=483|eir` → same workspace as `/workflow/[id]/draft`.
 */
export default async function NewInspectionPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const inspectionId = sp.inspectionId?.trim();
  if (!inspectionId) {
    redirect("/workflow");
  }
  const initialPhase = sp.phase === "eir" ? "eir" : "483";
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <WorkflowDraftWorkspace inspectionId={inspectionId} initialPhase={initialPhase} />
    </Suspense>
  );
}
