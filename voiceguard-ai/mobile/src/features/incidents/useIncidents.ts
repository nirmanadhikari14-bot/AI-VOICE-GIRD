import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import { IncidentSchema, IncidentNoteSchema } from '../../api/contracts/schemas';
import { IncidentData, IncidentNoteData } from '../../types';
import { z } from 'zod';

export function useIncidents(statusFilter?: string) {
  const queryClient = useQueryClient();

  const incidentsQuery = useQuery({
    queryKey: ['incidents', 'list', statusFilter],
    queryFn: async (): Promise<IncidentData[]> => {
      const raw = await apiClient.get<unknown[]>(ENDPOINTS.INCIDENTS, {
        params: { status: statusFilter },
      });
      return z.array(IncidentSchema).parse(raw) as unknown as IncidentData[];
    },
    staleTime: 5000,
  });

  const createIncidentMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      category?: string;
      severity?: string;
      priority?: string;
      summary: string;
      call_id?: number;
    }) => {
      const res = await apiClient.post<unknown>(ENDPOINTS.INCIDENTS, payload);
      return IncidentSchema.parse(res) as unknown as IncidentData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });

  return {
    incidents: incidentsQuery.data || [],
    isLoading: incidentsQuery.isLoading,
    isError: incidentsQuery.isError,
    refetch: incidentsQuery.refetch,
    createIncident: createIncidentMutation.mutateAsync,
    isCreating: createIncidentMutation.isPending,
  };
}

export function useIncidentDetail(incidentId: number) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ['incidents', 'detail', incidentId],
    queryFn: async (): Promise<IncidentData> => {
      const raw = await apiClient.get<unknown>(ENDPOINTS.INCIDENT_DETAIL(incidentId));
      return IncidentSchema.parse(raw) as unknown as IncidentData;
    },
    enabled: !!incidentId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiClient.post<unknown>(ENDPOINTS.INCIDENT_NOTES(incidentId), { content });
      return IncidentNoteSchema.parse(res) as unknown as IncidentNoteData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', 'detail', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents', 'list'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiClient.post(ENDPOINTS.INCIDENT_STATUS(incidentId), { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', 'detail', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents', 'list'] });
    },
  });

  return {
    incident: detailQuery.data || null,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    refetch: detailQuery.refetch,
    addNote: addNoteMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    isAddingNote: addNoteMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
  };
}
