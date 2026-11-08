import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import { CallSessionSchema } from '../../api/contracts/schemas';
import { CallSessionData } from '../../types';
import { realtimeSecurityService } from '../../services/realtime/socketService';
import { z } from 'zod';

export function useLiveSessions() {
  const queryClient = useQueryClient();

  const callsQuery = useQuery({
    queryKey: ['calls', 'active'],
    queryFn: async (): Promise<CallSessionData[]> => {
      const raw = await apiClient.get<unknown[]>(ENDPOINTS.CALLS_ACTIVE);
      return z.array(CallSessionSchema).parse(raw) as unknown as CallSessionData[];
    },
    staleTime: 3000,
  });

  useEffect(() => {
    // Attempt WebSocket realtime connection
    realtimeSecurityService.connect();

    // Configure controlled polling fallback
    realtimeSecurityService.setPollingFallback(async () => {
      await queryClient.invalidateQueries({ queryKey: ['calls', 'active'] });
    }, 4000);

    const unsubscribe = realtimeSecurityService.subscribe((_event) => {
      // Invalidate queries when server broadcasts an audio or threat event
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    return () => {
      unsubscribe();
      realtimeSecurityService.stopPolling();
    };
  }, [queryClient]);

  return {
    sessions: callsQuery.data || [],
    isLoading: callsQuery.isLoading,
    isError: callsQuery.isError,
    refetch: callsQuery.refetch,
    streamStatus: realtimeSecurityService.getStatus(),
  };
}

export function useCallDetail(callId: number) {
  return useQuery({
    queryKey: ['calls', 'detail', callId],
    queryFn: async (): Promise<CallSessionData> => {
      const raw = await apiClient.get<unknown>(ENDPOINTS.CALL_DETAIL(callId));
      return CallSessionSchema.parse(raw) as unknown as CallSessionData;
    },
    enabled: !!callId,
  });
}
