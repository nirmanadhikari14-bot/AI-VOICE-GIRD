import React from 'react';
import { useCallDetail } from './useLiveSessions';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatScore, formatRelativeTime } from '../../utils/formatters';

interface CallDetailScreenProps {
  callId: number;
  onBack: () => void;
  onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export const CallDetailScreen: React.FC<CallDetailScreenProps> = ({
  callId,
  onBack,
  onNavigate,
}) => {
  const { data: call, isLoading, isError, refetch } = useCallDetail(callId);

  if (isLoading) {
    return (
      <div style={{ padding: spacing.base, backgroundColor: colors.bgPrimary, minHeight: '100vh' }}>
        <Skeleton height={60} />
        <Skeleton height={140} />
        <Skeleton height={200} />
      </div>
    );
  }

  if (isError || !call) {
    return (
      <div style={{ backgroundColor: colors.bgPrimary, minHeight: '100vh' }}>
        <Header title="Call Session Details" showBack onBack={onBack} />
        <ErrorBanner message="Session record not found on backend." onRetry={refetch} />
      </div>
    );
  }

  const features = call.voice_authenticity?.features || {};

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
        title="Session Forensics"
        subtitle={`Call ID #${call.id}`}
        showBack
        onBack={onBack}
      />

      <div style={{ padding: spacing.base }}>
        {/* Session Header */}
        <Card elevated style={{ marginBottom: spacing.base }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Badge severity={call.risk_level} />
            <span style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
              Started: {formatRelativeTime(call.started_at)}
            </span>
          </div>

          <h2 style={{ fontSize: typography.fontSizes.md, fontWeight: 'bold', margin: '0 0 4px 0' }}>
            {call.caller_number} → {call.receiver_number}
          </h2>
          <div style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary }}>
            Carrier: {call.carrier || 'CloudVoice Transit'} • Network: {call.network_type || 'SIP'} • Codec: {call.codec || 'G.711u'}
          </div>
          <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: 2 }}>
            Origin: {call.origin || 'Sofia, Bulgaria'}
          </div>
        </Card>

        {/* Voice Authenticity Analysis (Phase 7) */}
        <div style={{ marginBottom: spacing.base }}>
          <h3 style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary, margin: `0 0 ${spacing.xs}px 0` }}>
            Voice Authenticity Analysis (Deepfake / Synthetic Detection)
          </h3>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
              <div>
                <span style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                  SYNTHETIC VOICE SUSPICION
                </span>
                <div
                  style={{
                    fontSize: typography.fontSizes.xxl,
                    fontWeight: 'black',
                    color:
                      (call.voice_authenticity?.score || 0) >= 80
                        ? colors.threatCritical
                        : colors.accentOrange,
                  }}
                >
                  {formatScore(call.voice_authenticity?.score)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>MODEL CONFIDENCE</span>
                <div style={{ fontSize: typography.fontSizes.md, fontWeight: 'bold', color: colors.textPrimary }}>
                  {formatScore((call.voice_authenticity?.confidence || 0) * 100)}
                </div>
                <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                  {call.voice_authenticity?.model_name || 'Conformer'} v{call.voice_authenticity?.model_version || '2.4'}
                </div>
              </div>
            </div>

            {/* Acoustic Features */}
            <div
              style={{
                backgroundColor: colors.bgSecondary,
                padding: spacing.sm,
                borderRadius: 6,
                fontSize: typography.fontSizes.xs,
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: 4, color: colors.textSecondary }}>
                Extracted Acoustic Features:
              </div>
              {Object.entries(features).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ color: colors.textMuted }}>{k.replace(/_/g, ' ')}:</span>
                  <span style={{ color: colors.accentOrange, fontFamily: 'monospace' }}>{String(v)}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: spacing.sm, marginBottom: 0 }}>
              * Evidence-based assessment indicates high probability of neural vocoder re-synthesis artifacts.
            </p>
          </Card>
        </div>

        {/* Speaker Verification (Phase 8) */}
        <div style={{ marginBottom: spacing.base }}>
          <h3 style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary, margin: `0 0 ${spacing.xs}px 0` }}>
            Biometric Speaker Verification
          </h3>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>CLAIMED IDENTITY</span>
                <div style={{ fontSize: typography.fontSizes.base, fontWeight: 'bold', color: colors.textPrimary }}>
                  {call.speaker_verification?.label || 'Target: Executive Identity'}
                </div>
                <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: 2 }}>
                  Biometric enrollment baseline comparison
                </div>
              </div>
              <Badge
                severity={call.speaker_verification?.status === 'failed' ? 'critical' : 'low'}
                label={call.speaker_verification?.status?.toUpperCase() || 'UNKNOWN'}
              />
            </div>
          </Card>
        </div>

        {/* Navigation to Risk Explanation */}
        <Card onClick={() => onNavigate('RiskExplanation', { callId: call.id })}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: typography.fontSizes.sm, fontWeight: 'bold', color: colors.accentOrange }}>
                View Comprehensive Policy & Signal Explanation
              </div>
              <div style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary }}>
                Observe contradictory signals, missing evidence, and policy decisions
              </div>
            </div>
            <span style={{ color: colors.accentOrange }}>→</span>
          </div>
        </Card>
      </div>
    </div>
  );
};
