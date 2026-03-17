"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getObservations,
  getObservationStats,
  generateObservations,
  downloadDocument,
  getLibrary,
  deleteLibraryItem,
  getHealth,
} from '@/lib/api';
import type { InspectionMetadata, DraftObservation } from '@/types/inspection';

export function useObservations(params: {
  q?: string;
  page?: number;
  per_page?: number;
  establishment_type?: string;
}) {
  return useQuery({
    queryKey: ['observations', params],
    queryFn: () => getObservations(params),
    placeholderData: (prev) => prev,
  });
}

export function useObservationStats() {
  return useQuery({
    queryKey: ['observation-stats'],
    queryFn: getObservationStats,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
  });
}

export function useGenerateObservations() {
  return useMutation({
    mutationFn: generateObservations,
    onError: () => toast.error('Failed to generate observations'),
  });
}

export function useGenerateDocument() {
  return useMutation({
    mutationFn: ({
      type,
      data,
    }: {
      type: '483' | 'eir' | 'both';
      data: { form_data: InspectionMetadata; observations: DraftObservation[] };
    }) => downloadDocument(type, data),
    onSuccess: () => toast.success('Document downloaded'),
    onError: () => toast.error('Document generation failed'),
  });
}

export function useLibrary() {
  return useQuery({
    queryKey: ['library'],
    queryFn: getLibrary,
  });
}

export function useDeleteLibraryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLibraryItem,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library'] });
      toast.success('Document deleted');
    },
    onError: () => toast.error('Failed to delete document'),
  });
}


