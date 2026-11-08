import React from 'react';
import { usePrevention } from './usePrevention';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatRelativeTime } from '../../utils/formatters';

interface PreventionActionsScreenProps {
  onBack: () => void;
  onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export const PreventionActionsScreen: React.FC<PreventionActionsScreenProps> = ({
  onBack,
  onNavigate,
}) => {
  const { actions, isLoading, refetch, approveAction, executeAction, isApproving, isExecuting } =
    usePrevention();

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'executed':
        return colors.success;
      case 'approved':
      case 'executing':
        return colors.accentCyan;
      case 'pending_approval':
      case 'proposed':
        return colors.warning;
      case 'failed':
      case 'cancelled':
        return colors.danger;
      default:
        return colors.textMuted;
    }
  };

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
        title="Prevention Actions"
        subtitle="Phase 20 Gatekeeper Countermeasures"
        showBack
        onBack={onBack}
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

      <div style={{ padding: spacing.base }}>
        <p
          style={{
            fontSize: typography.fontSizes.xs,
            color: colors.textMuted,
            margin: `0 0 ${spacing.base}px 0`,
          }}
        >
          Automated countermeasures deployed to isolate compromised telephony trunks or challenge
          suspicious callers before fraudulent funds transfer occurs.
        </p>

        {isLoading ? (
          <div>
            <Skeleton height={100} />
            <Skeleton height={100} />
          </div>
        ) : actions.length > 0 ? (
          actions.map((act) => {
            const statusColor = getStatusBadgeColor(act.status);
            return (
              <Card key={act.id} elevated style={{ marginBottom: spacing.base }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span
                      style={{
                        fontSize: typography.fontSizes.xs,
                        fontFamily: 'monospace',
                        color: colors.accentOrange,
                      }}
                    >
                      {act.action_type.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <h3 style={{ fontSize: typography.fontSizes.sm, fontWeight: 'bold', margin: '4px 0 2px 0' }}>
                      Policy: {act.policy_name || 'Standard Voice Defense'}
                    </h3>
                  </div>

                  <span
                    style={{
                      fontSize: typography.fontSizes.xs,
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor: `${statusColor}22`,
                      color: statusColor,
                      fontWeight: 'bold',
                      border: `1px solid ${statusColor}44`,
                    }}
                  >
                    {act.status.toUpperCase()}
                  </span>
                </div>

                <p style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary, margin: '8px 0 12px 0' }}>
                  {act.reason || 'Triggered by high synthetic voice probability threshold.'}
                </p>

                <div
                  style={{
                    backgroundColor: colors.bgSecondary,
                    padding: spacing.sm,
                    borderRadius: 6,
                    fontSize: typography.fontSizes.xs,
                    marginBottom: spacing.sm,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ color: colors.textMuted }}>Provider:</span>
                    <span style={{ color: colors.textPrimary }}>{act.provider}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: colors.textMuted }}>Updated:</span>
                    <span style={{ color: colors.textPrimary }}>{formatRelativeTime(act.updated_at)}</span>
                  </div>
                  {act.execution_result && (
                    <div style={{ marginTop: 4, paddingTop: 4, borderTop: `1px solid ${colors.borderSubtle}` }}>
                      <span style={{ color: colors.accentGreen }}>Outcome Confirmed:</span>{' '}
                      <span style={{ fontFamily: 'monospace', color: colors.textPrimary }}>
                        {JSON.stringify(act.execution_result)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Workflow Buttons */}
                <div style={{ display: 'flex', gap: spacing.xs }}>
                  {act.status === 'pending_approval' && (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={isApproving}
                      onClick={async () => {
                        await approveAction(act.id);
                        refetch();
                      }}
                      style={{ flex: 1 }}
                    >
                      Approve Action
                    </Button>
                  )}

                  {act.status === 'approved' && (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={isExecuting}
                      onClick={async () => {
                        await executeAction(act.id);
                        refetch();
                      }}
                      style={{ flex: 1, backgroundColor: colors.accentGreen }}
                    >
                      Execute Countermeasure
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        ) : (
          <EmptyState
            title="No Active Prevention Actions"
            description="The prevention engine has not queued any countermeasures."
          />
        )}
      </div>
    </div>
  );
};
