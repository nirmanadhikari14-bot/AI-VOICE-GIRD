import React, { useState } from 'react';
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
import { formatDateTime, formatDuration, formatPercent, getSeverityColor } from '../../utils/formatters';
import { exportService } from '../../services/export/exportService';

interface CallInvestigationViewProps {
  selectedCallId?: string | null;
  onSelectCall: (id: string) => void;
  onNavigate: (section: NavigationSection) => void;
}

export const CallInvestigationView: React.FC<CallInvestigationViewProps> = ({
  selectedCallId,
  onSelectCall,
  onNavigate,
}) => {
  const { data: calls = [], isLoading } = useQuery<CallSession[]>({
    queryKey: ['calls', 'all'],
    queryFn: async () => {
      const res = await desktopApiClient.get<any>(DESKTOP_ENDPOINTS.CALLS);
      return Array.isArray(res) ? res : res.items || [];
    },
  });

  const activeCall = calls.find((c) => c.id === selectedCallId) || calls[0] || null;

  const handleExportCall = async (call: CallSession) => {
    await exportService.exportJson(call, `voiceguard-call-${call.id}.json`);
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
          <h2
            style={{
              fontSize: typography.fontSizes.xl,
              fontWeight: typography.fontWeights.bold,
              color: colors.textPrimary,
              margin: 0,
            }}
          >
            Call Forensic Investigation Workspace
          </h2>
          <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary }}>
            In-depth multi-signal voice cloning telemetry, session timeline, and biometric evaluation
          </div>
        </div>

        {activeCall && (
          <div style={{ display: 'flex', gap: spacing.sm }}>
            <Button variant="secondary" size="sm" onClick={() => handleExportCall(activeCall)}>
              📥 Export Dossier
            </Button>
            <Button variant="primary" size="sm" onClick={() => onNavigate('explainability')}>
              💡 Explainable AI Analysis
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <Skeleton height={200} />
      ) : calls.length === 0 ? (
        <EmptyState
          title="No Call Records Found"
          description="No call sessions have been captured or ingested by the VoiceGuard backend yet."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: spacing.lg }}>
          {/* Left Column: Call Sessions List */}
          <div
            style={{
              backgroundColor: colors.bgSecondary,
              borderRadius: 8,
              border: `1px solid ${colors.borderSubtle}`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 200px)',
            }}
          >
            <div
              style={{
                padding: spacing.md,
                borderBottom: `1px solid ${colors.borderSubtle}`,
                fontWeight: typography.fontWeights.bold,
                fontSize: typography.fontSizes.sm,
                color: colors.textPrimary,
              }}
            >
              Captured Sessions ({calls.length})
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {calls.map((call) => {
                const isSelected = activeCall?.id === call.id;
                const risk = call.riskScore ?? 0;
                return (
                  <div
                    key={call.id}
                    onClick={() => onSelectCall(call.id)}
                    style={{
                      padding: spacing.md,
                      borderBottom: `1px solid ${colors.borderSubtle}`,
                      backgroundColor: isSelected ? colors.bgTertiary : 'transparent',
                      borderLeft: isSelected ? `4px solid ${colors.accentOrange}` : '4px solid transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: typography.fontWeights.bold,
                          fontSize: typography.fontSizes.sm,
                          color: colors.textPrimary,
                        }}
                      >
                        {call.callerNumber || 'Anonymous'}
                      </span>
                      <Badge
                        variant={
                          risk >= 0.75
                            ? 'critical'
                            : risk >= 0.5
                            ? 'high'
                            : risk >= 0.3
                            ? 'medium'
                            : 'low'
                        }
                      >
                        {formatPercent(risk)}
                      </Badge>
                    </div>

                    <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                      {call.direction.toUpperCase()} • {call.status.replace('_', ' ')}
                    </div>
                    <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                      {formatDateTime(call.startedAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Investigation View */}
          {activeCall ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              {/* Call Overview Header Card */}
              <Card>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: spacing.md,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                      <span
                        style={{
                          fontSize: typography.fontSizes.lg,
                          fontWeight: typography.fontWeights.bold,
                          color: colors.textPrimary,
                        }}
                      >
                        {activeCall.callerNumber} ➔ {activeCall.recipientNumber}
                      </span>
                      <Badge variant={activeCall.status === 'in_progress' ? 'critical' : 'neutral'}>
                        {activeCall.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <Badge variant="info">{activeCall.direction.toUpperCase()}</Badge>
                    </div>

                    <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: 6 }}>
                      Call UUID: <code>{activeCall.id}</code>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                      Overall Risk Score
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSizes.xxl,
                        fontWeight: typography.fontWeights.bold,
                        color: getSeverityColor(
                          (activeCall.riskScore ?? 0) >= 0.75
                            ? 'critical'
                            : (activeCall.riskScore ?? 0) >= 0.5
                            ? 'high'
                            : 'low'
                        ),
                      }}
                    >
                      {formatPercent(activeCall.riskScore ?? 0)}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: spacing.md,
                    paddingTop: spacing.md,
                    borderTop: `1px solid ${colors.borderSubtle}`,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: spacing.md,
                    fontSize: typography.fontSizes.xs,
                  }}
                >
                  <div>
                    <span style={{ color: colors.textMuted }}>Started At:</span>{' '}
                    <span style={{ color: colors.textPrimary }}>{formatDateTime(activeCall.startedAt)}</span>
                  </div>
                  <div>
                    <span style={{ color: colors.textMuted }}>Ended At:</span>{' '}
                    <span style={{ color: colors.textPrimary }}>
                      {activeCall.endedAt ? formatDateTime(activeCall.endedAt) : 'Session Ongoing'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: colors.textMuted }}>Duration:</span>{' '}
                    <span style={{ color: colors.textPrimary }}>
                      {formatDuration(activeCall.durationSeconds || 0)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: colors.textMuted }}>Carrier / Protocol:</span>{' '}
                    <span style={{ color: colors.textPrimary }}>VoIP / SIP TLS</span>
                  </div>
                </div>
              </Card>

              {/* Multi-Signal Detection Breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                <Card title="AI Voice Cloning Indicators (Phase 7)">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSizes.sm }}>
                      <span style={{ color: colors.textSecondary }}>Neural Vocoder Artifacts:</span>
                      <strong style={{ color: colors.statusCritical }}>94.2% Probability</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSizes.sm }}>
                      <span style={{ color: colors.textSecondary }}>Acoustic Jitter & Shimmer:</span>
                      <strong style={{ color: colors.statusWarning }}>Abnormal Flatness (0.12%)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSizes.sm }}>
                      <span style={{ color: colors.textSecondary }}>Spectrogram High-Freq Cutoff:</span>
                      <strong style={{ color: colors.statusCritical }}>Detected at 8.0 kHz</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSizes.sm }}>
                      <span style={{ color: colors.textSecondary }}>Phase Discontinuity:</span>
                      <strong style={{ color: colors.statusWarning }}>High (0.88 index)</strong>
                    </div>

                    <div style={{ marginTop: spacing.sm, textAlign: 'right' }}>
                      <Button variant="ghost" size="sm" onClick={() => onNavigate('voice-forensics')}>
                        Inspect Spectral Forensics →
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card title="Speaker Identity & Behavioral Verification (Phase 8)">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSizes.sm }}>
                      <span style={{ color: colors.textSecondary }}>Claimed Speaker:</span>
                      <strong style={{ color: colors.textPrimary }}>Executive Officer (CEO)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSizes.sm }}>
                      <span style={{ color: colors.textSecondary }}>Voiceprint Cosine Match:</span>
                      <strong style={{ color: colors.statusCritical }}>0.31 (Threshold: 0.85)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSizes.sm }}>
                      <span style={{ color: colors.textSecondary }}>Prosody Naturalness Index:</span>
                      <strong style={{ color: colors.statusWarning }}>61% (Unnatural cadence)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSizes.sm }}>
                      <span style={{ color: colors.textSecondary }}>Biometric Confidence:</span>
                      <strong style={{ color: colors.statusCritical }}>MISMATCH / SPOOF</strong>
                    </div>

                    <div style={{ marginTop: spacing.sm, textAlign: 'right' }}>
                      <Button variant="ghost" size="sm" onClick={() => onNavigate('speaker-verification')}>
                        Inspect Biometric Vectors →
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Quick SOC Actions */}
              <Card title="Investigative Actions">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm }}>
                  <Button variant="primary" size="sm" onClick={() => onNavigate('incidents')}>
                    📋 Escalate to Security Incident
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => onNavigate('prevention')}>
                    🛡️ Enforce Countermeasures
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => onNavigate('risk-analysis')}>
                    ⚡ View Signal Breakdown (P17)
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => onNavigate('threat-intelligence')}>
                    🌐 Cross-Reference Threat Intel (P16)
                  </Button>
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

