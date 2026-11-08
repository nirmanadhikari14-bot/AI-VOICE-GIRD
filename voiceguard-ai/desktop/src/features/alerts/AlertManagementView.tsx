import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { desktopApiClient } from '../../api/client';
import { DESKTOP_ENDPOINTS } from '../../api/endpoints';
import { SecurityAlert, AlertSeverity, AlertStatus } from '../../types';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/tokens';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Skeleton, EmptyState, ErrorBanner } from '../../components/common/Feedback';
import { formatDateTime, formatRelativeTime } from '../../utils/formatters';

export const AlertManagementView: React.FC = () => {
  const queryClient = useQueryClient();
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'all'>('all');
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: alerts = [], isLoading, error } = useQuery<SecurityAlert[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await desktopApiClient.get<any>(DESKTOP_ENDPOINTS.ALERTS);
      return Array.isArray(res) ? res : res.items || [];
    },
    refetchInterval: 5000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => {
      await desktopApiClient.post(DESKTOP_ENDPOINTS.ALERT_ACKNOWLEDGE(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to acknowledge alert');
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      await desktopApiClient.post(DESKTOP_ENDPOINTS.ALERT_DISMISS(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to dismiss alert');
    },
  });

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
        <div>
          <h2 style={{ fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold, color: colors.textPrimary, margin: 0 }}>
            Phase 19 — Security Alert & Notification Center
          </h2>
          <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary }}>
            Centralized intake, triage, acknowledgement, and resolution of voice cloning alerts
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
          <Button variant={filterSeverity === 'all' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilterSeverity('all')}>
            All ({alerts.length})
          </Button>
          <Button variant={filterSeverity === 'critical' ? 'danger' : 'ghost'} size="sm" onClick={() => setFilterSeverity('critical')}>
            Critical
          </Button>
          <Button variant={filterSeverity === 'high' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilterSeverity('high')}>
            High
          </Button>
          <Button variant={filterSeverity === 'medium' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilterSeverity('medium')}>
            Medium
          </Button>
        </div>
      </div>

      {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />}
      {error && <ErrorBanner message={(error as any).message} />}

      {/* Alerts Grid */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <Skeleton height={80} />
          <Skeleton height={80} />
          <Skeleton height={80} />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          title="No Matching Security Alerts"
          description="There are no security alerts matching the selected filter criteria."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {filteredAlerts.map((alert) => {
            const isPending =
              acknowledgeMutation.isPending || dismissMutation.isPending;

            return (
              <Card key={alert.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing.md }}>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: 4 }}>
                      <Badge variant={alert.severity}>{alert.severity.toUpperCase()}</Badge>
                      <Badge variant={alert.status === 'active' ? 'warning' : 'neutral'}>
                        {alert.status.toUpperCase()}
                      </Badge>
                      <span style={{ fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.bold, color: colors.textPrimary }}>
                        {alert.title}
                      </span>
                    </div>

                    <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary, marginBottom: 8 }}>
                      {alert.description}
                    </div>

                    <div style={{ display: 'flex', gap: spacing.md, fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                      <span>Alert ID: <code>{alert.id}</code></span>
                      {alert.callId && <span>Call ID: <code>{alert.callId}</code></span>}
                      <span>Created: {formatDateTime(alert.createdAt)} ({formatRelativeTime(alert.createdAt)})</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: spacing.xs, alignItems: 'center' }}>
                    {alert.status === 'active' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isPending}
                        onClick={() => acknowledgeMutation.mutate(alert.id)}
                      >
                        ✓ Acknowledge
                      </Button>
                    )}
                    {alert.status !== 'dismissed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => dismissMutation.mutate(alert.id)}
                      >
                        Dismiss
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

