import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { desktopApiClient } from '../../api/client';
import { DESKTOP_ENDPOINTS } from '../../api/endpoints';
import { CallSession, NavigationSection } from '../../types';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/tokens';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Skeleton, EmptyState } from '../../components/common/Feedback';
import { formatDuration, formatPercent, getSeverityColor } from '../../utils/formatters';

interface LiveMonitoringViewProps {
  onNavigate: (section: NavigationSection) => void;
  onSelectCall: (callId: string) => void;
}

export const LiveMonitoringView: React.FC<LiveMonitoringViewProps> = ({ onNavigate, onSelectCall }) => {
  const [filterDirection, setFilterDirection] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [now, setNow] = useState(Date.now());

  // Duration timer update
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: calls = [], isLoading, refetch } = useQuery<CallSession[]>({
    queryKey: ['calls', 'live'],
    queryFn: async () => {
      const res = await desktopApiClient.get<any>(DESKTOP_ENDPOINTS.CALLS);
      return Array.isArray(res) ? res : res.items || [];
    },
    refetchInterval: 3000,
  });

  const activeCalls = calls.filter((c) => {
    const isLive = c.status === 'in_progress';
    if (!isLive) return false;
    if (filterDirection !== 'all' && c.direction !== filterDirection) return false;
    return true;
  });

  const calculateDurationSeconds = (startedAt: string) => {
    const start = new Date(startedAt).getTime();
    if (isNaN(start)) return 0;
    return Math.max(0, Math.floor((now - start) / 1000));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <h2
              style={{
                fontSize: typography.fontSizes.xl,
                fontWeight: typography.fontWeights.bold,
                color: colors.textPrimary,
                margin: 0,
              }}
            >
              Active Call Telemetry & Live Monitor
            </h2>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: colors.statusCritical,
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: typography.fontSizes.xs,
                fontWeight: typography.fontWeights.bold,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: colors.statusCritical,
                  boxShadow: `0 0 6px ${colors.statusCritical}`,
                }}
              />
              REC & LIVE ANALYSIS
            </div>
          </div>
          <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary }}>
            Near-real-time streaming of speech signals, acoustic anomaly detection, and risk scoring
          </div>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: spacing.xs }}>
          <Button
            variant={filterDirection === 'all' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilterDirection('all')}
          >
            All Live ({calls.filter((c) => c.status === 'in_progress').length})
          </Button>
          <Button
            variant={filterDirection === 'inbound' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilterDirection('inbound')}
          >
            Inbound
          </Button>
          <Button
            variant={filterDirection === 'outbound' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilterDirection('outbound')}
          >
            Outbound
          </Button>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Active Call Sessions List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <Skeleton height={90} />
          <Skeleton height={90} />
        </div>
      ) : activeCalls.length === 0 ? (
        <EmptyState
          title="No Active Voice Sessions"
          description="There are currently no live calls undergoing active audio stream inspection. Completed sessions are available in the Call Investigation tab."
          actionText="View Completed Calls"
          onAction={() => onNavigate('calls')}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {activeCalls.map((call) => {
            const durationSec = calculateDurationSeconds(call.startedAt);
            const risk = call.riskScore ?? 0;
            const isClonedSuspect = risk >= 0.7;

            return (
              <Card key={call.id}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: spacing.md,
                  }}
                >
                  {/* Left Column: Call Metadata */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        backgroundColor: isClonedSuspect ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                        color: isClonedSuspect ? colors.statusCritical : colors.statusSuccess,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                      }}
                    >
                      {call.direction === 'inbound' ? '📥' : '📤'}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                        <span
                          style={{
                            fontSize: typography.fontSizes.base,
                            fontWeight: typography.fontWeights.bold,
                            color: colors.textPrimary,
                          }}
                        >
                          {call.callerNumber || 'Anonymous'} ➔ {call.recipientNumber || 'Corporate PBX'}
                        </span>
                        <Badge variant={call.direction === 'inbound' ? 'info' : 'neutral'}>
                          {call.direction.toUpperCase()}
                        </Badge>
                      </div>

                      <div style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 4 }}>
                        Session ID: <code style={{ color: colors.accentOrange }}>{call.id}</code> • Duration:{' '}
                        <strong>{formatDuration(durationSec)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Audio Waveform Simulation & Voice Authenticity Indicator */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      minWidth: 180,
                    }}
                  >
                    <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                      Real-Time Audio Spectrum
                    </div>
                    {/* Dynamic Simulated Equalizer Bars */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: 24, gap: 3 }}>
                      {[40, 75, 90, 60, 30, 85, 95, 50, 65, 80, 45, 90, 70].map((h, i) => (
                        <div
                          key={i}
                          style={{
                            width: 4,
                            height: `${Math.max(15, (h * ((now % 10) + 1)) % 100)}%`,
                            backgroundColor: isClonedSuspect ? colors.statusCritical : colors.accentBlue,
                            borderRadius: 2,
                            transition: 'height 0.2s ease',
                          }}
                        />
                      ))}
                    </div>
                    <Badge variant={isClonedSuspect ? 'critical' : 'success'}>
                      {isClonedSuspect ? '⚠️ HIGH CLONING PROBABILITY' : '✓ AUTHENTIC VOICE TONE'}
                    </Badge>
                  </div>

                  {/* Right Column: Risk Gauge & Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                        Phase 17 Risk Score
                      </div>
                      <div
                        style={{
                          fontSize: typography.fontSizes.xl,
                          fontWeight: typography.fontWeights.bold,
                          color: getSeverityColor(
                            risk >= 0.75 ? 'critical' : risk >= 0.5 ? 'high' : risk >= 0.3 ? 'medium' : 'low'
                          ),
                        }}
                      >
                        {formatPercent(risk)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          onSelectCall(call.id);
                          onNavigate('calls');
                        }}
                      >
                        🔬 Investigate Call
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onNavigate('prevention')}
                      >
                        🛡️ Intervene
                      </Button>
                    </div>
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

