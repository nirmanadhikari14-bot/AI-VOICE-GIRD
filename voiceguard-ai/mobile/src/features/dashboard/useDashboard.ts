import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import {
  RiskScoreSchema,
  AlertSchema,
  IncidentSchema,
  CallSessionSchema,
} from '../../api/contracts/schemas';
import { RiskScoreData, AlertData, IncidentData, CallSessionData } from '../../types';
import { z } from 'zod';

export type SecurityMonitoringStatus =
  | 'monitoring_active'
  | 'limited_monitoring'
  | 'no_recent_assessment'
  | 'connection_unavailable'
  | 'additional_verification_required';

export interface DashboardData {
  securityStatus: SecurityMonitoringStatus;
  statusLabel: string;
  statusDescription: string;
  latestRisk: RiskScoreData | null;
  recentAlerts: AlertData[];
  recentIncidents: IncidentData[];
  activeCalls: CallSessionData[];
}

export function useDashboard() {
  const latestRiskQuery = useQuery({
    queryKey: ['risk', 'latest'],
    queryFn: async (): Promise<RiskScoreData | null> => {
      try {
        const raw = await apiClient.get<unknown>(ENDPOINTS.RISK_LATEST);
        return RiskScoreSchema.parse(raw) as unknown as RiskScoreData;
      } catch (err: any) {
        if (err.status === 404) return null;
        throw err;
      }
    },
    staleTime: 5000,
  });

  const alertsQuery = useQuery({
    queryKey: ['alerts', 'recent'],
    queryFn: async (): Promise<AlertData[]> => {
      try {
        const raw = await apiClient.get<unknown[]>(ENDPOINTS.ALERTS, { params: { limit: 5 } });
        return z.array(AlertSchema).parse(raw) as unknown as AlertData[];
      } catch (err: any) {
        if (err.status === 404) return [];
        throw err;
      }
    },
    staleTime: 5000,
  });

  const incidentsQuery = useQuery({
    queryKey: ['incidents', 'recent'],
    queryFn: async (): Promise<IncidentData[]> => {
      try {
        const raw = await apiClient.get<unknown[]>(ENDPOINTS.INCIDENTS, { params: { limit: 3 } });
        return z.array(IncidentSchema).parse(raw) as unknown as IncidentData[];
      } catch (err: any) {
        if (err.status === 404) return [];
        throw err;
      }
    },
    staleTime: 5000,
  });

  const callsQuery = useQuery({
    queryKey: ['calls', 'active'],
    queryFn: async (): Promise<CallSessionData[]> => {
      try {
        const raw = await apiClient.get<unknown[]>(ENDPOINTS.CALLS_ACTIVE);
        return z.array(CallSessionSchema).parse(raw) as unknown as CallSessionData[];
      } catch (err: any) {
        if (err.status === 404) return [];
        throw err;
      }
    },
    staleTime: 4000,
  });

  const isLoading =
    latestRiskQuery.isLoading ||
    alertsQuery.isLoading ||
    incidentsQuery.isLoading ||
    callsQuery.isLoading;

  const isError =
    latestRiskQuery.isError &&
    alertsQuery.isError &&
    incidentsQuery.isError &&
    callsQuery.isError;

  // Determine security state strictly according to backend data
  let securityStatus: SecurityMonitoringStatus = 'limited_monitoring';
  let statusLabel = 'Limited Monitoring';
  let statusDescription = 'No active telephony sessions currently streaming.';

  if (isError) {
    securityStatus = 'connection_unavailable';
    statusLabel = 'Connection Unavailable';
    statusDescription = 'Cannot reach VoiceGuard AI backend security service.';
  } else if (latestRiskQuery.data && latestRiskQuery.data.overall_score >= 80) {
    securityStatus = 'additional_verification_required';
    statusLabel = 'Critical Warning';
    statusDescription = 'Synthetic voice attack detected. Out-of-band verification required.';
  } else if (callsQuery.data && callsQuery.data.length > 0) {
    securityStatus = 'monitoring_active';
    statusLabel = 'Active Protection';
    statusDescription = `${callsQuery.data.length} session(s) under real-time acoustic analysis.`;
  } else if (!latestRiskQuery.data) {
    securityStatus = 'no_recent_assessment';
    statusLabel = 'No Recent Assessment';
    statusDescription = 'Awaiting incoming session telemetry from gatekeeper.';
  }

  const dashboardData: DashboardData = {
    securityStatus,
    statusLabel,
    statusDescription,
    latestRisk: latestRiskQuery.data || null,
    recentAlerts: alertsQuery.data || [],
    recentIncidents: incidentsQuery.data || [],
    activeCalls: callsQuery.data || [],
  };

  const refetchAll = async () => {
    await Promise.all([
      latestRiskQuery.refetch(),
      alertsQuery.refetch(),
      incidentsQuery.refetch(),
      callsQuery.refetch(),
    ]);
  };

  return {
    data: dashboardData,
    isLoading,
    isError,
    refetch: refetchAll,
  };
}
