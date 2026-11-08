import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import { PreventionActionSchema } from '../../api/contracts/schemas';
import { PreventionActionData } from '../../types';
import { z } from 'zod';

export function usePrevention(statusFilter?: string) {
  const queryClient = useQueryClient();

  const actionsQuery = useQuery({
    queryKey: ['prevention', 'list', statusFilter],
    queryFn: async (): Promise<PreventionActionData[]> => {
      const raw = await apiClient.get<unknown[]>(ENDPOINTS.PREVENTION_ACTIONS, {
        params: { status: statusFilter },
      });
      return z.array(PreventionActionSchema).parse(raw) as unknown as PreventionActionData[];
    },
    staleTime: 5000,
  });

  const approveMutation = useMutation({
    mutationFn: async (actionId: number) => {
      return apiClient.post(ENDPOINTS.PREVENTION_APPROVE(actionId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prevention'] });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (actionId: number) => {
      return apiClient.post(ENDPOINTS.PREVENTION_EXECUTE(actionId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prevention'] });
    },
  });

  return {
    actions: actionsQuery.data || [],
    isLoading: actionsQuery.isLoading,
    isError: actionsQuery.isError,
    refetch: actionsQuery.refetch,
    approveAction: approveMutation.mutateAsync,
    executeAction: executeMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    isExecuting: executeMutation.isPending,
  };
}

export function usePreventionDetail(actionId: number) {
  return useQuery({
    queryKey: ['prevention', 'detail', actionId],
    queryFn: async (): Promise<PreventionActionData> => {
      const raw = await apiClient.get<unknown>(ENDPOINTS.PREVENTION_ACTION_DETAIL(actionId));
      return PreventionActionSchema.parse(raw) as unknown as PreventionActionData;
    },
    enabled: !!actionId,
  });
}
