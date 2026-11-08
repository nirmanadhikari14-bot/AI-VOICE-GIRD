import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import { RiskExplanationSchema } from '../../api/contracts/schemas';
import { RiskExplanationData } from '../../types';

export function useRiskExplanation(callId: number) {
  return useQuery({
    queryKey: ['risk', 'explanation', callId],
    queryFn: async (): Promise<RiskExplanationData> => {
      const raw = await apiClient.get<unknown>(ENDPOINTS.RISK_EXPLAIN(callId));
      return RiskExplanationSchema.parse(raw) as unknown as RiskExplanationData;
    },
    enabled: !!callId,
  });
}
