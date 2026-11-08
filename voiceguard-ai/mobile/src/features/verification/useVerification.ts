import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import { VerificationSessionSchema } from '../../api/contracts/schemas';
import { VerificationSessionData } from '../../types';

export function useSecondaryVerification() {
  const requestMutation = useMutation({
    mutationFn: async (payload: { call_id?: number; target_identity: string; verification_type?: string }) => {
      const res = await apiClient.post<unknown>(ENDPOINTS.VERIFICATION_REQUEST, payload);
      return VerificationSessionSchema.parse(res) as unknown as VerificationSessionData;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (payload: { verification_id: number; decision: string; notes?: string }) => {
      const res = await apiClient.post<unknown>(ENDPOINTS.VERIFICATION_VERIFY, payload);
      return VerificationSessionSchema.parse(res) as unknown as VerificationSessionData;
    },
  });

  return {
    requestVerification: requestMutation.mutateAsync,
    submitVerificationDecision: verifyMutation.mutateAsync,
    isRequesting: requestMutation.isPending,
    isVerifying: verifyMutation.isPending,
    session: requestMutation.data || null,
  };
}

export function useVerificationStatus(verificationId: number) {
  return useQuery({
    queryKey: ['verification', 'status', verificationId],
    queryFn: async (): Promise<VerificationSessionData> => {
      const res = await apiClient.get<unknown>(ENDPOINTS.VERIFICATION_STATUS(verificationId));
      return VerificationSessionSchema.parse(res) as unknown as VerificationSessionData;
    },
    enabled: !!verificationId,
    refetchInterval: 3000, // Poll status every 3s while pending
  });
}
