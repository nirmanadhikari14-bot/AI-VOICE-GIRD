import React, { useState } from 'react';
import { useAlerts } from './useAlerts';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatRelativeTime } from '../../utils/formatters';

interface AlertListScreenProps {
  onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export const AlertListScreen: React.FC<AlertListScreenProps> = ({ onNavigate }) => {
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const { alerts, isLoading, refetch } = useAlerts(filter);

  const filters = [
    { label: 'All', value: undefined },
    { label: 'Active', value: 'active' },
    { label: 'Acknowledged', value: 'acknowledged' },
    { label: 'Dismissed', value: 'dismissed' },
  ];

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
        title="Security Alerts"
        subtitle="Real-time Voice Threat Notifications"
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
            ↻
          </button>
        }
      />

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: spacing.xs,
          padding: `${spacing.sm}px ${spacing.base}px`,
          backgroundColor: colors.bgSecondary,
          borderBottom: `1px solid ${colors.borderSubtle}`,
          overflowX: 'auto',
        }}
      >
        {filters.map((f) => {
          const isSelected = filter === f.value;
          return (
            <button
              key={f.label}
              onClick={() => setFilter(f.value)}
              style={{
                backgroundColor: isSelected ? colors.accentOrange : colors.bgElevated,
                color: isSelected ? '#ffffff' : colors.textSecondary,
                border: `1px solid ${isSelected ? colors.accentOrange : colors.borderSubtle}`,
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.medium,
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: spacing.base }}>
        {isLoading ? (
          <div>
            <Skeleton height={80} />
            <Skeleton height={80} />
            <Skeleton height={80} />
          </div>
        ) : alerts.length > 0 ? (
          alerts.map((alert) => (
            <Card
              key={alert.id}
              onClick={() => onNavigate('AlertDetail', { alertId: alert.id })}
              style={{
                marginBottom: spacing.sm,
                borderLeft: `4px solid ${
                  alert.severity === 'critical' ? colors.threatCritical : colors.threatHigh
                }`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, marginRight: spacing.sm }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, marginBottom: 4 }}>
                    <Badge severity={alert.severity} />
                    <span
                      style={{
                        fontSize: typography.fontSizes.xs,
                        textTransform: 'uppercase',
                        color: colors.textMuted,
                        fontFamily: 'monospace',
                      }}
                    >
                      {alert.alert_type}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.semibold,
                      color: colors.textPrimary,
                      margin: '0 0 4px 0',
                    }}
                  >
                    {alert.title}
                  </h3>
                  <p
                    style={{
                      fontSize: typography.fontSizes.xs,
                      color: colors.textSecondary,
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {alert.message}
                  </p>
                  {alert.caller_number && (
                    <div
                      style={{
                        fontSize: typography.fontSizes.xs,
                        color: colors.textMuted,
                        marginTop: spacing.xs,
                      }}
                    >
                      Caller: {alert.caller_number}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                    {formatRelativeTime(alert.created_at)}
                  </span>
                  <div style={{ marginTop: 8 }}>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor:
                          alert.status === 'active'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : alert.status === 'acknowledged'
                            ? 'rgba(59, 130, 246, 0.2)'
                            : 'rgba(107, 114, 128, 0.2)',
                        color:
                          alert.status === 'active'
                            ? colors.threatCritical
                            : alert.status === 'acknowledged'
                            ? colors.accentBlue
                            : colors.textMuted,
                      }}
                    >
                      {alert.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No Alerts Found"
            description="No voice cloning threats match your selected filter."
          />
        )}
      </div>
    </div>
  );
};
