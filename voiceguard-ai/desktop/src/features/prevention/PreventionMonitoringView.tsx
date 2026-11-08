import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { desktopApiClient } from '../../api/client';
import { DESKTOP_ENDPOINTS } from '../../api/endpoints';
import { PreventionAction } from '../../types';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/tokens';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Skeleton, EmptyState, ErrorBanner } from '../../components/common/Feedback';
import { formatDateTime, formatRelativeTime } from '../../utils/formatters';

export const PreventionMonitoringView: React.FC = () => {
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: actions = [], isLoading } = useQuery<PreventionAction[]>({
    queryKey: ['prevention', 'actions'],
    queryFn: async () => {
      const res = await desktopApiClient.get<any>(DESKTOP_ENDPOINTS.PREVENTION_ACTIONS);
      return Array.isArray(res) ? res : res.items || [];
    },
    refetchInterval: 5000,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      await desktopApiClient.post(DESKTOP_ENDPOINTS.PREVENTION_APPROVE(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prevention'] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to approve prevention action');
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (id: string) => {
      await desktopApiClient.post(DESKTOP_ENDPOINTS.PREVENTION_EXECUTE(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prevention'] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to execute prevention action');
    },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
        <div>
          <h2 style={{ fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold, color: colors.textPrimary, margin: 0 }}>
            Phase 20 — Automated Prevention & Active Countermeasures
          </h2>
          <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary }}>
            Enforce real-time call drops, push-to-verify step-up authentication, and audio warning tone injection
          </div>
        </div>

        <div style={{ display: 'flex', gap: spacing.sm }}>
          <Button variant="secondary" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['prevention'] })}>
            🔄 Refresh Actions
          </Button>
        </div>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      {/* Prevention Actions List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <Skeleton height={90} />
          <Skeleton height={90} />
        </div>
      ) : actions.length === 0 ? (
        <EmptyState
          title="No Active Prevention Actions"
          description="All automated defense policies are satisfied. No pending intervention holds require analyst approval."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {actions.map((act) => {
            const isPending = approveMutation.isPending || executeMutation.isPending;
            const statusVariant =
              act.status === 'executed'
                ? 'success'
                : act.status === 'approved'
                ? 'warning'
                : act.status === 'pending'
                ? 'critical'
                : 'neutral';

            return (
              <Card key={act.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: 4 }}>
                      <span style={{ fontSize: typography.fontSizes.base, fontWeight: typography.fontWeights.bold, color: colors.textPrimary }}>
                        {act.actionType.toUpperCase().replace('_', ' ')}
                      </span>
                      <Badge variant={statusVariant}>{act.status.toUpperCase()}</Badge>
                      <span style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                        Target: <strong style={{ color: colors.textPrimary }}>{act.target}</strong>
                      </span>
                    </div>

                    <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary, marginBottom: 6 }}>
                      {act.reason || 'Triggered by Phase 17 Critical Multi-Modal Risk Threshold Breached'}
                    </div>

                    <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                      Action ID: <code>{act.id}</code> • Initiated: {formatDateTime(act.createdAt)} ({formatRelativeTime(act.createdAt)})
                    </div>
                  </div>

                  {/* Operational Controls */}
                  <div style={{ display: 'flex', gap: spacing.sm }}>
                    {act.status === 'pending' && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isPending}
                        onClick={() => approveMutation.mutate(act.id)}
                      >
                        ✓ Authorize Action
                      </Button>
                    )}
                    {act.status !== 'executed' && (
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={isPending}
                        onClick={() => executeMutation.mutate(act.id)}
                      >
                        ⚡ Execute Now
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

