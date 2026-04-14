"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type GuardFn = (status: string | null | undefined) => {
  ok: boolean;
  reason?: string;
  redirectTo?: string;
};

/**
 * Fetches the inspection's current status and runs `guardFn` against it.
 * If the guard fails, shows a toast and redirects the user.
 *
 * Returns `{ allowed, loading, status }` so the page can decide what to render.
 */
export function useWorkflowGuard(
  inspectionId: string | null | undefined,
  guardFn: GuardFn
) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!inspectionId) {
      setLoading(false);
      setAllowed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/inspections/${inspectionId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const st: string | null = data?.inspection?.status ?? null;
        setStatus(st);
        const result = guardFn(st);
        if (!result.ok) {
          toast.error(result.reason || "Access denied for this workflow stage.");
          router.replace(
            result.redirectTo
              ? `${result.redirectTo}/${inspectionId}`
              : `/workflow/${inspectionId}`
          );
          setAllowed(false);
        } else {
          setAllowed(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Could not verify inspection status.");
          router.replace("/workflow");
          setAllowed(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [inspectionId, guardFn, router]);

  return { allowed, loading, status };
}
