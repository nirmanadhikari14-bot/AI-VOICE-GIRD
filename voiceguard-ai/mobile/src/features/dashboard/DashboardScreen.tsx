import React from 'react';
import { useDashboard } from './useDashboard';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatScore, formatRelativeTime } from '../../utils/formatters';

interface DashboardScreenProps {
  onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const { data, isLoading, isError, refetch } = useDashboard();

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: colors.bgPrimary,
        color: colors.textPrimary,
        minHeight: '100vh',
        overflowY: 'auto',
        paddingBottom: spacing.hero,
      }}
    >
      <Header
        title="VoiceGuard AI"
        subtitle="Voice Cloning Impersonation Defense"
        isLive={data.securityStatus === 'monitoring_active'}
        rightAction={
          <button
            onClick={() => refetch()}
            style={{
              background: 'transparent',
              border: `1px solid ${colors.borderDefault}`,
              color: colors.textSecondary,
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: typography.fontSizes.xs,
              cursor: 'pointer',
            }}
          >
            ↻ Refresh
          </button>
        }
      />

      {isError && (
        <ErrorBanner
          message="Backend security engine unreachable. Showing cached or offline view."
          onRetry={refetch}
          isOffline
        />
      )}

      <div style={{ padding: spacing.base }}>
        {/* A. Security Status Banner */}
        <Card
          elevated
          style={{
            marginBottom: spacing.base,
            borderLeft: `4px solid ${
              data.securityStatus === 'additional_verification_required'
                ? colors.threatCritical
                : data.securityStatus === 'monitoring_active'
                ? colors.accentGreen
                : colors.accentOrange
            }`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.bold,
                color: colors.textMuted,
                letterSpacing: 0.8,
              }}
            >
              SYSTEM SECURITY STATE
            </span>
            <Badge
              severity={
                data.securityStatus === 'additional_verification_required'
                  ? 'critical'
                  : data.securityStatus === 'monitoring_active'
                  ? 'low'
                  : 'medium'
              }
              label={data.statusLabel}
            />
          </div>
          <p
            style={{
              fontSize: typography.fontSizes.sm,
              color: colors.textSecondary,
              marginTop: spacing.xs,
              marginBottom: 0,
            }}
          >
            {data.statusDescription}
          </p>
        </Card>

        {/* B. Risk Overview */}
        <div style={{ marginBottom: spacing.base }}>
          <h2
            style={{
              fontSize: typography.fontSizes.base,
              fontWeight: typography.fontWeights.semibold,
              color: colors.textPrimary,
              margin: `0 0 ${spacing.xs}px 0`,
            }}
          >
            Active Risk Assessment
          </h2>

          {isLoading ? (
            <Card>
              <Skeleton height={24} width="60%" />
              <Skeleton height={40} width="40%" />
              <Skeleton height={16} width="80%" />
            </Card>
          ) : data.latestRisk ? (
            <Card
              onClick={() =>
                onNavigate('RiskExplanation', { callId: data.latestRisk?.call_id })
              }
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                    <span
                      style={{
                        fontSize: typography.fontSizes.xxl,
                        fontWeight: typography.fontWeights.black,
                        color:
                          data.latestRisk.overall_score >= 80
                            ? colors.threatCritical
                            : colors.accentOrange,
                      }}
                    >
                      {formatScore(data.latestRisk.overall_score)}
                    </span>
                    <span style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                      THREAT INDEX
                    </span>
                  </div>
                  <div style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 4 }}>
                    Caller: <strong style={{ color: colors.textPrimary }}>{data.latestRisk.caller_number}</strong>
                  </div>
                  <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                    Target: {data.latestRisk.target}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <Badge severity={data.latestRisk.risk_level} />
                  <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: 8 }}>
                    {formatRelativeTime(data.latestRisk.created_at)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: spacing.md,
                  paddingTop: spacing.sm,
                  borderTop: `1px solid ${colors.borderSubtle}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: typography.fontSizes.xs, color: colors.accentOrange }}>
                  Model: {data.latestRisk.model_name} (Conf: {(data.latestRisk.confidence * 100).toFixed(0)}%)
                </span>
                <span style={{ fontSize: typography.fontSizes.xs, color: colors.accentBlue }}>
                  View Explanation →
                </span>
              </div>
            </Card>
          ) : (
            <Card>
              <p style={{ fontSize: typography.fontSizes.sm, color: colors.textMuted, margin: 0 }}>
                No active threats recorded. Voice stream baseline nominal.
              </p>
            </Card>
          )}
        </div>

        {/* C. Quick Actions */}
        <div style={{ marginBottom: spacing.base }}>
          <h2
            style={{
              fontSize: typography.fontSizes.base,
              fontWeight: typography.fontWeights.semibold,
              color: colors.textPrimary,
              margin: `0 0 ${spacing.xs}px 0`,
            }}
          >
            Quick Actions
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: spacing.sm,
            }}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('ReportSuspicious')}
              style={{ justifyContent: 'flex-start', padding: spacing.md }}
            >
              🚨 Report Call
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('SecondaryVerification')}
              style={{ justifyContent: 'flex-start', padding: spacing.md }}
            >
              🔐 Verify Identity
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('PreventionActions')}
              style={{ justifyContent: 'flex-start', padding: spacing.md }}
            >
              🛡️ Prevention Actions
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('Security')}
              style={{ justifyContent: 'flex-start', padding: spacing.md }}
            >
              📡 Live Sessions
            </Button>
          </div>
        </div>

        {/* D. Recent Alerts */}
        <div style={{ marginBottom: spacing.base }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
            <h2
              style={{
                fontSize: typography.fontSizes.base,
                fontWeight: typography.fontWeights.semibold,
                color: colors.textPrimary,
                margin: 0,
              }}
            >
              Recent Alerts
            </h2>
            <button
              onClick={() => onNavigate('Alerts')}
              style={{
                background: 'none',
                border: 'none',
                color: colors.accentOrange,
                fontSize: typography.fontSizes.xs,
                cursor: 'pointer',
              }}
            >
              View All ({data.recentAlerts.length})
            </button>
          </div>

          {isLoading ? (
            <Skeleton height={70} />
          ) : data.recentAlerts.length > 0 ? (
            data.recentAlerts.map((alert) => (
              <Card
                key={alert.id}
                onClick={() => onNavigate('AlertDetail', { alertId: alert.id })}
                style={{ marginBottom: spacing.xs }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, marginRight: spacing.sm }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                      <Badge severity={alert.severity} />
                      <span
                        style={{
                          fontSize: typography.fontSizes.sm,
                          fontWeight: typography.fontWeights.medium,
                          color: colors.textPrimary,
                        }}
                      >
                        {alert.title}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: typography.fontSizes.xs,
                        color: colors.textSecondary,
                        margin: `${spacing.xxs}px 0 0 0`,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {alert.message}
                    </p>
                  </div>
                  <span style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                    {formatRelativeTime(alert.created_at)}
                  </span>
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <p style={{ fontSize: typography.fontSizes.sm, color: colors.textMuted, margin: 0 }}>
                No recent security alerts.
              </p>
            </Card>
          )}
        </div>

        {/* E. Recent Incidents */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
            <h2
              style={{
                fontSize: typography.fontSizes.base,
                fontWeight: typography.fontWeights.semibold,
                color: colors.textPrimary,
                margin: 0,
              }}
            >
              Incident Queue
            </h2>
            <button
              onClick={() => onNavigate('Incidents')}
              style={{
                background: 'none',
                border: 'none',
                color: colors.accentOrange,
                fontSize: typography.fontSizes.xs,
                cursor: 'pointer',
              }}
            >
              View All
            </button>
          </div>

          {data.recentIncidents.map((inc) => (
            <Card
              key={inc.id}
              onClick={() => onNavigate('IncidentDetail', { incidentId: inc.id })}
              style={{ marginBottom: spacing.xs }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span
                    style={{
                      fontSize: typography.fontSizes.xs,
                      fontFamily: 'monospace',
                      color: colors.accentCyan,
                    }}
                  >
                    {inc.incident_number}
                  </span>
                  <div
                    style={{
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.medium,
                      color: colors.textPrimary,
                      marginTop: 2,
                    }}
                  >
                    {inc.title}
                  </div>
                  <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: 2 }}>
                    Assigned: {inc.assigned_to || 'Unassigned'} • Status: {inc.status}
                  </div>
                </div>
                <Badge severity={inc.severity} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
