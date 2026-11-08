import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { desktopApiClient } from '../../api/client';
import { DESKTOP_ENDPOINTS } from '../../api/endpoints';
import { CallSession, SecurityAlert, SecurityIncident, ThreatIndicator, NavigationSection } from '../../types';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/tokens';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Skeleton, ErrorBanner } from '../../components/common/Feedback';
import { formatRelativeTime, formatPercent, getSeverityColor } from '../../utils/formatters';
import { exportService } from '../../services/export/exportService';

interface DashboardViewProps {
  onNavigate: (section: NavigationSection) => void;
  onSelectCall?: (callId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onSelectCall }) => {
  const callsQuery = useQuery<CallSession[]>({
    queryKey: ['calls', 'active'],
    queryFn: async () => {
      const res = await desktopApiClient.get<any>(DESKTOP_ENDPOINTS.CALLS);
      return Array.isArray(res) ? res : res.items || [];
    },
    refetchInterval: 5000,
  });

  const alertsQuery = useQuery<SecurityAlert[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await desktopApiClient.get<any>(DESKTOP_ENDPOINTS.ALERTS);
      return Array.isArray(res) ? res : res.items || [];
    },
    refetchInterval: 5000,
  });

  const incidentsQuery = useQuery<SecurityIncident[]>({
    queryKey: ['incidents'],
    queryFn: async () => {
      const res = await desktopApiClient.get<any>(DESKTOP_ENDPOINTS.INCIDENTS);
      return Array.isArray(res) ? res : res.items || [];
    },
    refetchInterval: 5000,
  });

  const threatsQuery = useQuery<ThreatIndicator[]>({
    queryKey: ['threats'],
    queryFn: async () => {
      const res = await desktopApiClient.get<any>(DESKTOP_ENDPOINTS.THREAT_INDICATORS);
      return Array.isArray(res) ? res : res.items || [];
    },
    refetchInterval: 10000,
  });

  const isLoading = callsQuery.isLoading || alertsQuery.isLoading;

  const calls = callsQuery.data || [];
  const alerts = alertsQuery.data || [];
  const incidents = incidentsQuery.data || [];
  const threats = threatsQuery.data || [];

  const activeCalls = calls.filter((c) => c.status === 'in_progress');
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const openIncidents = incidents.filter((i) => i.status !== 'closed' && i.status !== 'resolved');

  // Compute average risk score of active calls
  const avgRisk =
    activeCalls.length > 0
      ? activeCalls.reduce((acc, c) => acc + (c.riskScore ?? 0), 0) / activeCalls.length
      : calls.length > 0
      ? calls.reduce((acc, c) => acc + (c.riskScore ?? 0), 0) / calls.length
      : 0;

  const handleExportSummary = async () => {
    const summaryData = {
      timestamp: new Date().toISOString(),
      activeCallsCount: activeCalls.length,
      totalCallsCount: calls.length,
      criticalAlertsCount: criticalAlerts.length,
      openIncidentsCount: openIncidents.length,
      threatIndicatorsCount: threats.length,
      averageRiskScore: avgRisk,
      recentAlerts: alerts.slice(0, 10),
    };
    await exportService.exportJson(summaryData, `voiceguard-soc-summary-${Date.now()}.json`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Top Header & Quick Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: spacing.md,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: typography.fontSizes.xl,
              fontWeight: typography.fontWeights.bold,
              color: colors.textPrimary,
              margin: 0,
            }}
          >
            SOC Threat & Operations Dashboard
          </h2>
          <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary }}>
            Real-time voice impersonation defense and telemetry overview
          </div>
        </div>

        <div style={{ display: 'flex', gap: spacing.sm }}>
          <Button variant="secondary" size="sm" onClick={handleExportSummary}>
            📥 Export SOC Report
          </Button>
          <Button variant="primary" size="sm" onClick={() => onNavigate('live-monitoring')}>
            📡 View Live Sessions
          </Button>
        </div>
      </div>

      {callsQuery.error && (
        <ErrorBanner
          message={`Failed to fetch live calls: ${(callsQuery.error as any).message}`}
          onDismiss={() => callsQuery.refetch()}
        />
      )}

      {/* KPI Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: spacing.md,
        }}
      >
        <Card>
          <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, textTransform: 'uppercase' }}>
            Active Monitored Calls
          </div>
          <div
            style={{
              fontSize: typography.fontSizes.xxl,
              fontWeight: typography.fontWeights.bold,
              color: colors.accentOrange,
              margin: '4px 0',
            }}
          >
            {isLoading ? <Skeleton width={60} height={32} /> : activeCalls.length}
          </div>
          <div style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary }}>
            {calls.length} total call sessions logged
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, textTransform: 'uppercase' }}>
            Active Security Alerts
          </div>
          <div
            style={{
              fontSize: typography.fontSizes.xxl,
              fontWeight: typography.fontWeights.bold,
              color: criticalAlerts.length > 0 ? colors.statusCritical : colors.statusSuccess,
              margin: '4px 0',
            }}
          >
            {isLoading ? <Skeleton width={60} height={32} /> : alerts.length}
          </div>
          <div style={{ fontSize: typography.fontSizes.xs, color: colors.statusCritical }}>
            {criticalAlerts.length} critical severity alerts
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, textTransform: 'uppercase' }}>
            Open Incidents
          </div>
          <div
            style={{
              fontSize: typography.fontSizes.xxl,
              fontWeight: typography.fontWeights.bold,
              color: colors.accentBlue,
              margin: '4px 0',
            }}
          >
            {isLoading ? <Skeleton width={60} height={32} /> : openIncidents.length}
          </div>
          <div style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary }}>
            Under active SOC investigation
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, textTransform: 'uppercase' }}>
            Average Risk Posture
          </div>
          <div
            style={{
              fontSize: typography.fontSizes.xxl,
              fontWeight: typography.fontWeights.bold,
              color: getSeverityColor(avgRisk >= 0.75 ? 'critical' : avgRisk >= 0.5 ? 'high' : avgRisk >= 0.3 ? 'medium' : 'low'),
              margin: '4px 0',
            }}
          >
            {isLoading ? <Skeleton width={60} height={32} /> : formatPercent(avgRisk)}
          </div>
          <div style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary }}>
            Phase 17 multi-modal risk score
          </div>
        </Card>
      </div>

      {/* Main Grid: Live Calls Snapshot & Real-time Alerts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: spacing.lg,
        }}
      >
        {/* Active Monitored Calls Snapshot */}
        <Card
          title="Monitored Voice Sessions"
          subtitle="Real-time voice cloning detection status"
          actions={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('calls')}>
              All Calls →
            </Button>
          }
        >
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              <Skeleton height={40} />
              <Skeleton height={40} />
            </div>
          ) : calls.length === 0 ? (
            <div style={{ padding: spacing.md, textAlign: 'center', color: colors.textMuted }}>
              No call sessions recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {calls.slice(0, 5).map((call) => (
                <div
                  key={call.id}
                  onClick={() => {
                    if (onSelectCall) onSelectCall(call.id);
                    onNavigate('calls');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: spacing.sm,
                    backgroundColor: colors.bgTertiary,
                    borderRadius: 6,
                    border: `1px solid ${colors.borderSubtle}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: typography.fontWeights.bold, color: colors.textPrimary }}>
                      {call.callerNumber || 'Unknown'} ➔ {call.recipientNumber || 'Protected Endpoint'}
                    </div>
                    <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                      {call.direction.toUpperCase()} • {call.status.replace('_', ' ')} • {formatRelativeTime(call.startedAt)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    {call.riskScore !== undefined && (
                      <Badge
                        variant={
                          call.riskScore >= 0.75
                            ? 'critical'
                            : call.riskScore >= 0.5
                            ? 'high'
                            : call.riskScore >= 0.3
                            ? 'medium'
                            : 'low'
                        }
                      >
                        Risk {formatPercent(call.riskScore)}
                      </Badge>
                    )}
                    <span style={{ fontSize: 14 }}>➔</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Security Alerts Snapshot */}
        <Card
          title="Urgent Security Alerts"
          subtitle="Phase 19 threshold breaches and voice cloning flags"
          actions={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('alerts')}>
              View Alerts →
            </Button>
          }
        >
          {alertsQuery.isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              <Skeleton height={40} />
              <Skeleton height={40} />
            </div>
          ) : alerts.length === 0 ? (
            <div style={{ padding: spacing.md, textAlign: 'center', color: colors.textMuted }}>
              No active alerts. System status nominal.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: spacing.sm,
                    backgroundColor: colors.bgTertiary,
                    borderRadius: 6,
                    border: `1px solid ${colors.borderSubtle}`,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                      <Badge variant={alert.severity}>{alert.severity}</Badge>
                      <span
                        style={{
                          fontWeight: typography.fontWeights.bold,
                          color: colors.textPrimary,
                          fontSize: typography.fontSizes.sm,
                        }}
                      >
                        {alert.title}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSizes.xs,
                        color: colors.textSecondary,
                        marginTop: 2,
                        maxWidth: 320,
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {alert.description}
                    </div>
                  </div>

                  <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                    {formatRelativeTime(alert.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Threat Indicators Quick Bar */}
      <Card
        title="Global Threat Intelligence Snapshot (Phase 16)"
        subtitle="Reputation-flagged caller vectors and synthetic voice fingerprints"
        actions={
          <Button variant="ghost" size="sm" onClick={() => onNavigate('threat-intelligence')}>
            Explore Threat Intel →
          </Button>
        }
      >
        {threatsQuery.isLoading ? (
          <Skeleton height={50} />
        ) : threats.length === 0 ? (
          <div style={{ color: colors.textMuted, fontSize: typography.fontSizes.sm }}>
            No known threat indicators in local cache.
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
            {threats.slice(0, 6).map((ioc) => (
              <div
                key={ioc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                  padding: '6px 12px',
                  backgroundColor: colors.bgTertiary,
                  border: `1px solid ${colors.borderSubtle}`,
                  borderRadius: 6,
                  fontSize: typography.fontSizes.xs,
                }}
              >
                <span style={{ color: colors.textMuted }}>{ioc.type.toUpperCase()}:</span>
                <span style={{ fontWeight: typography.fontWeights.bold, color: colors.textPrimary }}>
                  {ioc.value}
                </span>
                <Badge variant={ioc.severity}>{ioc.severity}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

