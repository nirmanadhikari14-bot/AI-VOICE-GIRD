import React from 'react';
import { useLiveSessions } from './useLiveSessions';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatRelativeTime, formatScore } from '../../utils/formatters';

interface LiveSecurityScreenProps {
  onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export const LiveSecurityScreen: React.FC<LiveSecurityScreenProps> = ({ onNavigate }) => {
  const { sessions, isLoading, refetch, streamStatus } = useLiveSessions();

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
        title="Live Security Sessions"
        subtitle="Acoustic Voice Authentication Stream"
        isLive={sessions.length > 0}
        rightAction={
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
            <span
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 10,
                backgroundColor:
                  streamStatus === 'connected'
                    ? 'rgba(16, 185, 129, 0.2)'
                    : streamStatus === 'polling'
                    ? 'rgba(245, 158, 11, 0.2)'
                    : 'rgba(239, 68, 68, 0.2)',
                color:
                  streamStatus === 'connected'
                    ? colors.accentGreen
                    : streamStatus === 'polling'
                    ? colors.accentYellow
                    : colors.threatCritical,
                fontWeight: 'bold',
                textTransform: 'uppercase',
              }}
            >
              {streamStatus}
            </span>
            <button
              onClick={() => refetch()}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.borderDefault}`,
                color: colors.textSecondary,
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: typography.fontSizes.xs,
                cursor: 'pointer',
              }}
            >
              ↻
            </button>
          </div>
        }
      />

      {/* Platform capability notice */}
      <div
        style={{
          margin: `${spacing.sm}px ${spacing.base}px`,
          padding: spacing.sm,
          backgroundColor: colors.bgSecondary,
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: 8,
          fontSize: typography.fontSizes.xs,
          color: colors.textMuted,
          lineHeight: 1.4,
        }}
      >
        ℹ️ <strong>Platform Architecture Notice:</strong> Mobile OS restrictions prevent arbitrary
        cellular call wiretapping without carrier trunking or enterprise PBX routing. Real-time
        streams shown reflect connected enterprise SIP extensions and user-authorized sessions.
      </div>

      <div style={{ padding: spacing.base }}>
        {isLoading ? (
          <div>
            <Skeleton height={100} />
            <Skeleton height={100} />
          </div>
        ) : sessions.length > 0 ? (
          sessions.map((call) => (
            <Card
              key={call.id}
              onClick={() => onNavigate('CallDetail', { callId: call.id })}
              style={{
                marginBottom: spacing.base,
                borderLeft: `4px solid ${
                  call.risk_level === 'critical'
                    ? colors.threatCritical
                    : call.risk_level === 'high'
                    ? colors.threatHigh
                    : colors.accentGreen
                }`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                    <span
                      style={{
                        fontSize: typography.fontSizes.sm,
                        fontWeight: typography.fontWeights.bold,
                        color: colors.textPrimary,
                      }}
                    >
                      {call.caller_number}
                    </span>
                    <span style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                      → {call.receiver_number}
                    </span>
                  </div>
                  <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: 4 }}>
                    Type: {call.call_type || 'VoIP Stream'} • Codec: {call.codec || 'G.711'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <Badge severity={call.risk_level} />
                  <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: 4 }}>
                    {formatRelativeTime(call.started_at)}
                  </div>
                </div>
              </div>

              {/* Forensic Score Breakdown */}
              <div
                style={{
                  marginTop: spacing.md,
                  padding: spacing.sm,
                  backgroundColor: colors.bgSecondary,
                  borderRadius: 6,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: spacing.sm,
                }}
              >
                <div>
                  <span style={{ fontSize: 10, color: colors.textMuted }}>SYNTHETIC VOICE SUSPICION</span>
                  <div
                    style={{
                      fontSize: typography.fontSizes.base,
                      fontWeight: 'bold',
                      color:
                        (call.voice_authenticity?.score || 0) > 80
                          ? colors.threatCritical
                          : colors.textPrimary,
                    }}
                  >
                    {formatScore(call.voice_authenticity?.score)}
                  </div>
                  <span style={{ fontSize: 10, color: colors.textMuted }}>
                    Model: {call.voice_authenticity?.model_name || 'Conformer-v2'}
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: 10, color: colors.textMuted }}>SPEAKER VERIFICATION</span>
                  <div
                    style={{
                      fontSize: typography.fontSizes.base,
                      fontWeight: 'bold',
                      color:
                        call.speaker_verification?.status === 'failed'
                          ? colors.threatCritical
                          : colors.accentGreen,
                    }}
                  >
                    {call.speaker_verification?.status?.toUpperCase() || 'NOMINAL'}
                  </div>
                  <span style={{ fontSize: 10, color: colors.textMuted }}>
                    {call.speaker_verification?.label || 'Verified Identity'}
                  </span>
                </div>
              </div>

              <div
                style={{
                  marginTop: spacing.sm,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: typography.fontSizes.xs, color: colors.accentOrange }}>
                  Origin: {call.origin || 'Sofia, Bulgaria (VoIP)'}
                </span>
                <span style={{ fontSize: typography.fontSizes.xs, color: colors.accentBlue }}>
                  Forensic Details →
                </span>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No Active Telephony Sessions"
            description="The gateway has not detected ongoing voice streams for your monitored extension."
          />
        )}
      </div>
    </div>
  );
};
