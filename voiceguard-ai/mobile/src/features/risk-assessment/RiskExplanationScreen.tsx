import React from 'react';
import { useRiskExplanation } from './useRisk';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatScore, formatRelativeTime } from '../../utils/formatters';

interface RiskExplanationScreenProps {
  callId: number;
  onBack: () => void;
  onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export const RiskExplanationScreen: React.FC<RiskExplanationScreenProps> = ({
  callId,
  onBack,
  onNavigate,
}) => {
  const { data: explanation, isLoading, isError, refetch } = useRiskExplanation(callId);

  if (isLoading) {
    return (
      <div style={{ padding: spacing.base, backgroundColor: colors.bgPrimary, minHeight: '100vh' }}>
        <Skeleton height={60} />
        <Skeleton height={140} />
        <Skeleton height={200} />
      </div>
    );
  }

  if (isError || !explanation) {
    return (
      <div style={{ backgroundColor: colors.bgPrimary, minHeight: '100vh' }}>
        <Header title="Risk Explanation" showBack onBack={onBack} />
        <ErrorBanner
          message="Detailed explanation for this session is currently unavailable from backend engine."
          onRetry={refetch}
        />
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
      <Header
        title="Risk & Explainability"
        subtitle={`Session ID #${explanation.call_id}`}
        showBack
        onBack={onBack}
      />

      <div style={{ padding: spacing.base }}>
        {/* Risk Score Summary */}
        <Card elevated style={{ marginBottom: spacing.base }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, letterSpacing: 0.8 }}>
                AI-CALIBRATED THREAT SCORE
              </div>
              <div
                style={{
                  fontSize: typography.fontSizes.display,
                  fontWeight: typography.fontWeights.black,
                  color:
                    explanation.overall_score >= 80 ? colors.threatCritical : colors.accentOrange,
                }}
              >
                {formatScore(explanation.overall_score)}
              </div>
              <div style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary }}>
                Confidence: {(explanation.confidence * 100).toFixed(1)}% • Assessed:{' '}
                {formatRelativeTime(explanation.timestamp)}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <Badge severity={explanation.risk_level} />
              <div
                style={{
                  marginTop: spacing.sm,
                  fontSize: typography.fontSizes.xs,
                  color: colors.accentYellow,
                  maxWidth: 140,
                }}
              >
                {explanation.recommended_decision.replace(/_/g, ' ')}
              </div>
            </div>
          </div>
        </Card>

        {/* 1. Observed Acoustic Evidence */}
        <div style={{ marginBottom: spacing.base }}>
          <h3
            style={{
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.semibold,
              color: colors.textPrimary,
              margin: `0 0 ${spacing.xs}px 0`,
            }}
          >
            1. Observed Acoustic & Signal Evidence
          </h3>
          <Card>
            {explanation.observed_evidence.map((ev, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: spacing.xs,
                  marginBottom: i === explanation.observed_evidence.length - 1 ? 0 : spacing.xs,
                  fontSize: typography.fontSizes.xs,
                  color: colors.textSecondary,
                  lineHeight: 1.4,
                }}
              >
                <span style={{ color: colors.accentOrange }}>•</span>
                <span>{ev}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* 2. Model Conclusions */}
        <div style={{ marginBottom: spacing.base }}>
          <h3
            style={{
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.semibold,
              color: colors.textPrimary,
              margin: `0 0 ${spacing.xs}px 0`,
            }}
          >
            2. Model-Generated Inference
          </h3>
          <Card>
            {explanation.model_conclusions.map((conc, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: spacing.xs,
                  marginBottom: i === explanation.model_conclusions.length - 1 ? 0 : spacing.xs,
                  fontSize: typography.fontSizes.xs,
                  color: colors.textPrimary,
                  lineHeight: 1.4,
                }}
              >
                <span style={{ color: colors.threatCritical }}>▲</span>
                <span>{conc}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* 3. Policy Decisions */}
        <div style={{ marginBottom: spacing.base }}>
          <h3
            style={{
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.semibold,
              color: colors.textPrimary,
              margin: `0 0 ${spacing.xs}px 0`,
            }}
          >
            3. Automated Policy Decisions Triggered
          </h3>
          <Card>
            {explanation.policy_decisions.map((pol, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: spacing.xs,
                  marginBottom: i === explanation.policy_decisions.length - 1 ? 0 : spacing.xs,
                  fontSize: typography.fontSizes.xs,
                  color: colors.textSecondary,
                  lineHeight: 1.4,
                }}
              >
                <span style={{ color: colors.accentCyan }}>■</span>
                <span>{pol}</span>
              </div>
            ))}
          </Card>
        </div>

        {/* 4. Recommended Actions vs Executed Actions */}
        <div style={{ marginBottom: spacing.base }}>
          <h3
            style={{
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.semibold,
              color: colors.textPrimary,
              margin: `0 0 ${spacing.xs}px 0`,
            }}
          >
            4. Recommended vs Executed Actions
          </h3>
          <Card>
            <div style={{ marginBottom: spacing.sm }}>
              <span style={{ fontSize: typography.fontSizes.xs, fontWeight: 'bold', color: colors.warning }}>
                Recommended by System:
              </span>
              {explanation.recommended_actions.map((rec, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: typography.fontSizes.xs,
                    color: colors.textSecondary,
                    marginTop: 2,
                    paddingLeft: spacing.sm,
                  }}
                >
                  → {rec}
                </div>
              ))}
            </div>

            <div style={{ paddingTop: spacing.xs, borderTop: `1px solid ${colors.borderSubtle}` }}>
              <span style={{ fontSize: typography.fontSizes.xs, fontWeight: 'bold', color: colors.success }}>
                Confirmed Executed:
              </span>
              {explanation.actions_executed.map((act, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: typography.fontSizes.xs,
                    color: colors.textPrimary,
                    marginTop: 2,
                    paddingLeft: spacing.sm,
                  }}
                >
                  ✓ {act}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 5. Contradictory & Missing Signals */}
        <div style={{ marginBottom: spacing.base }}>
          <h3
            style={{
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.semibold,
              color: colors.textMuted,
              margin: `0 0 ${spacing.xs}px 0`,
            }}
          >
            5. Signal Ambiguity & Missing Evidence
          </h3>
          <Card>
            {explanation.contradictory_evidence.map((c, i) => (
              <div
                key={`c-${i}`}
                style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginBottom: 4 }}
              >
                ⚠️ <em>Contradictory signal:</em> {c}
              </div>
            ))}
            {explanation.missing_signals.map((m, i) => (
              <div
                key={`m-${i}`}
                style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}
              >
                ℹ️ <em>Missing signal:</em> {m}
              </div>
            ))}
          </Card>
        </div>

        {/* Navigation to Verification */}
        <Card
          onClick={() =>
            onNavigate('SecondaryVerification', {
              callId: explanation.call_id,
              targetIdentity: 'Citibank Treasury Desk',
            })
          }
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: typography.fontSizes.sm, fontWeight: 'bold', color: colors.accentOrange }}>
                Initiate Out-of-Band Secondary Verification
              </div>
              <div style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary }}>
                Challenge caller via registered enterprise authentication channel
              </div>
            </div>
            <span style={{ color: colors.accentOrange, fontSize: typography.fontSizes.md }}>→</span>
          </div>
        </Card>
      </div>
    </div>
  );
};
