import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import { AlertSchema } from '../../api/contracts/schemas';
import { AlertData } from '../../types';
import { z } from 'zod';

export function useAlerts(filterStatus?: string) {
  const queryClient = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: ['alerts', 'list', filterStatus],
    queryFn: async (): Promise<AlertData[]> => {
      const raw = await apiClient.get<unknown[]>(ENDPOINTS.ALERTS, {
        params: { status: filterStatus },
      });
      return z.array(AlertSchema).parse(raw) as unknown as AlertData[];
    },
    staleTime: 5000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiClient.post(ENDPOINTS.ALERT_ACKNOWLEDGE(alertId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['risk'] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiClient.post(ENDPOINTS.ALERT_DISMISS(alertId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['risk'] });
    },
  });

  return {
    alerts: alertsQuery.data || [],
    isLoading: alertsQuery.isLoading,
    isError: alertsQuery.isError,
    refetch: alertsQuery.refetch,
    acknowledgeAlert: acknowledgeMutation.mutateAsync,
    dismissAlert: dismissMutation.mutateAsync,
    isAcknowledging: acknowledgeMutation.isPending,
    isDismissing: dismissMutation.isPending,
  };
}

export function useAlertDetail(alertId: number) {
  return useQuery({
    queryKey: ['alerts', 'detail', alertId],
    queryFn: async (): Promise<AlertData> => {
      const raw = await apiClient.get<unknown>(ENDPOINTS.ALERT_DETAIL(alertId));
      return AlertSchema.parse(raw) as unknown as AlertData;
    },
    enabled: !!alertId,
  });
}
