import { Suspense } from "react";
import WorkflowDraftWorkspace from "@/components/workflow/WorkflowDraftWorkspace";

export const dynamic = "force-dynamic";

export default function WorkflowDraftPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <WorkflowDraftWorkspace />
    </Suspense>
  );
}
