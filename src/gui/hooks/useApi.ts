"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getObservations,
  getObservationStats,
  generateObservations,
  downloadDocument,
  getLibrary,
  deleteLibraryItem,
  getHealth,
  getInspectionEvaluationDashboard,
  getEvalMetrics,
} from "@/lib/api";
import type { InspectionMetadata, DraftObservation } from "@/types/inspection";

export function useObservations(params: {
  q?: string;
  page?: number;
  per_page?: number;
  establishment_type?: string;
}) {
  return useQuery({
    queryKey: ["observations", params],
    queryFn: () => getObservations(params),
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
}

export function useObservationStats() {
  return useQuery({
    queryKey: ["observation-stats"],
    queryFn: getObservationStats,
    staleTime: 60_000,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    staleTime: 60_000,
  });
}

export function useGenerateObservations() {
  return useMutation({
    mutationFn: generateObservations,
    retry: 2,
    onError: (error) => {
      const msg =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`AI generation failed: ${msg}. Retrying automatically…`);
    },
    onSuccess: () => {
      toast.success("Observations generated successfully");
    },
  });
}

export function useGenerateDocument() {
  return useMutation({
    mutationFn: ({
      type,
      data,
    }: {
      type: "483" | "eir" | "both";
      data: {
        form_data: InspectionMetadata;
        observations: DraftObservation[];
      };
    }) => downloadDocument(type, data),
    onSuccess: () => toast.success("Document downloaded"),
    onError: (error) => {
      const msg =
        error instanceof Error ? error.message : "Document generation failed";
      toast.error(msg);
    },
  });
}

export function useLibrary() {
  return useQuery({
    queryKey: ["library"],
    queryFn: getLibrary,
    staleTime: 60_000,
  });
}

export function useDeleteLibraryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLibraryItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      toast.success("Document deleted");
    },
    onError: () => toast.error("Failed to delete document"),
  });
}

export function useInspectionEvaluation(inspectionId: string | null) {
  return useQuery({
    queryKey: ["inspection-evaluation", inspectionId],
    queryFn: () => getInspectionEvaluationDashboard(inspectionId!),
    enabled: !!inspectionId,
    staleTime: 60_000,
  });
}

export function useEvalMetrics() {
  return useQuery({
    queryKey: ["eval-metrics"],
    queryFn: getEvalMetrics,
    staleTime: 60_000,
  });
}
