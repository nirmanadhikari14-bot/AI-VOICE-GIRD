import React from 'react';
import { useAlertDetail, useAlerts } from './useAlerts';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatRelativeTime } from '../../utils/formatters';

interface AlertDetailScreenProps {
  alertId: number;
  onBack: () => void;
  onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export const AlertDetailScreen: React.FC<AlertDetailScreenProps> = ({
  alertId,
  onBack,
  onNavigate,
}) => {
  const { data: alert, isLoading, isError, refetch } = useAlertDetail(alertId);
  const { acknowledgeAlert, dismissAlert, isAcknowledging, isDismissing } = useAlerts();

  if (isLoading) {
    return (
      <div style={{ padding: spacing.base, backgroundColor: colors.bgPrimary, minHeight: '100vh' }}>
        <Skeleton height={60} />
        <Skeleton height={200} />
      </div>
    );
  }

  if (isError || !alert) {
    return (
      <div style={{ backgroundColor: colors.bgPrimary, minHeight: '100vh' }}>
        <Header title="Alert Details" showBack onBack={onBack} />
        <ErrorBanner message="Failed to load alert details from backend." onRetry={refetch} />
      </div>
    );
  }

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
      <Header title="Alert Details" showBack onBack={onBack} />

      <div style={{ padding: spacing.base }}>
        <Card elevated style={{ marginBottom: spacing.base }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Badge severity={alert.severity} />
            <span style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
              Alert #{alert.id} • {formatRelativeTime(alert.created_at)}
            </span>
          </div>

          <h2
            style={{
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.bold,
              color: colors.textPrimary,
              margin: '0 0 8px 0',
            }}
          >
            {alert.title}
          </h2>

          <p
            style={{
              fontSize: typography.fontSizes.sm,
              color: colors.textSecondary,
              lineHeight: 1.5,
              margin: '0 0 16px 0',
            }}
          >
            {alert.message}
          </p>

          <div
            style={{
              backgroundColor: colors.bgSecondary,
              padding: spacing.md,
              borderRadius: 8,
              border: `1px solid ${colors.borderSubtle}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>Threat Type:</span>
              <span style={{ fontSize: typography.fontSizes.xs, color: colors.accentOrange, fontFamily: 'monospace' }}>
                {alert.alert_type}
              </span>
            </div>
            {alert.caller_number && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>Caller Number:</span>
                <span style={{ fontSize: typography.fontSizes.xs, color: colors.textPrimary }}>
                  {alert.caller_number}
                </span>
              </div>
            )}
            {alert.target && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>Protected Target:</span>
                <span style={{ fontSize: typography.fontSizes.xs, color: colors.textPrimary }}>
                  {alert.target}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>Current Status:</span>
              <span
                style={{
                  fontSize: typography.fontSizes.xs,
                  fontWeight: 'bold',
                  color: alert.status === 'active' ? colors.threatCritical : colors.accentBlue,
                }}
              >
                {alert.status.toUpperCase()}
              </span>
            </div>
          </div>
        </Card>

        {/* Linked Evidence & Actions */}
        <div style={{ marginBottom: spacing.base }}>
          <h3
            style={{
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.semibold,
              color: colors.textSecondary,
              margin: `0 0 ${spacing.xs}px 0`,
            }}
          >
            Associated Forensic Context
          </h3>

          {alert.call_id ? (
            <Card
              onClick={() => onNavigate('RiskExplanation', { callId: alert.call_id })}
              style={{ marginBottom: spacing.xs }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: typography.fontSizes.sm, fontWeight: 'bold', color: colors.textPrimary }}>
                    AI Risk & Explainability Breakdown
                  </div>
                  <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: 2 }}>
                    Inspect vocoder cues, acoustic jitter, and policy reasons
                  </div>
                </div>
                <span style={{ fontSize: typography.fontSizes.sm, color: colors.accentOrange }}>→</span>
              </div>
            </Card>
          ) : (
            <Card>
              <span style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                No telephony session ID directly associated with this alert.
              </span>
            </Card>
          )}

          <Card
            onClick={() => onNavigate('PreventionActions')}
            style={{ marginBottom: spacing.xs }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: typography.fontSizes.sm, fontWeight: 'bold', color: colors.textPrimary }}>
                  Active Prevention Countermeasures
                </div>
                <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: 2 }}>
                  Review proposed call termination and gatekeeper actions
                </div>
              </div>
              <span style={{ fontSize: typography.fontSizes.sm, color: colors.accentOrange }}>→</span>
            </div>
          </Card>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: spacing.sm }}>
          {alert.status === 'active' && (
            <Button
              variant="primary"
              loading={isAcknowledging}
              onClick={async () => {
                await acknowledgeAlert(alert.id);
                refetch();
              }}
              style={{ flex: 1 }}
            >
              Acknowledge Alert
            </Button>
          )}

          {alert.status !== 'dismissed' && (
            <Button
              variant="secondary"
              loading={isDismissing}
              onClick={async () => {
                await dismissAlert(alert.id);
                refetch();
              }}
              style={{ flex: 1 }}
            >
              Dismiss Alert
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
