import React, { useState } from 'react';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/tokens';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatPercent, getSeverityColor } from '../../utils/formatters';

export const RiskAnalysisView: React.FC = () => {
  const [voiceCloningScore, setVoiceCloningScore] = useState(0.94);
  const [speakerMismatchScore, setMismatchScore] = useState(0.88);
  const [behavioralScore, setBehavioralScore] = useState(0.65);
  const [callerReputationScore, setReputationScore] = useState(0.70);
  const [networkAnomalyScore, setNetworkScore] = useState(0.40);

  // Phase 17 formula: Composite Weighted Risk
  const weights = {
    voice: 0.40,
    speaker: 0.20,
    behavioral: 0.15,
    reputation: 0.15,
    network: 0.10,
  };

  const compositeRisk =
    voiceCloningScore * weights.voice +
    speakerMismatchScore * weights.speaker +
    behavioralScore * weights.behavioral +
    callerReputationScore * weights.reputation +
    networkAnomalyScore * weights.network;

  const getPolicyAction = (risk: number) => {
    if (risk >= 0.80) return { action: 'IMMEDIATE_TERMINATION', color: 'critical', desc: 'Drop session and trigger high-severity incident' };
    if (risk >= 0.60) return { action: 'CHALLENGE_SECONDARY_AUTH', color: 'warning', desc: 'Execute out-of-band mobile verification challenge' };
    if (risk >= 0.35) return { action: 'FLAG_FOR_AUDIT', color: 'info', desc: 'Warn recipient in real-time and log telemetry' };
    return { action: 'ALLOW_SESSION', color: 'success', desc: 'Call parameters within nominal trust baseline' };
  };

  const policy = getPolicyAction(compositeRisk);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
        <div>
          <h2 style={{ fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold, color: colors.textPrimary, margin: 0 }}>
            Phase 17 — Central Multi-Modal Risk Engine
          </h2>
          <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary }}>
            Real-time composite scoring pipeline synthesizing acoustic, biometric, behavioral, and threat signals
          </div>
        </div>

        <div style={{ display: 'flex', gap: spacing.sm }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setVoiceCloningScore(0.94);
              setMismatchScore(0.88);
              setBehavioralScore(0.65);
              setReputationScore(0.70);
              setNetworkScore(0.40);
            }}
          >
            Reset to Active Session
          </Button>
        </div>
      </div>

      {/* Primary Composite Score Display */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
          <div>
            <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, textTransform: 'uppercase' }}>
              Phase 17 Calculated Composite Risk
            </div>
            <div
              style={{
                fontSize: 48,
                fontWeight: typography.fontWeights.bold,
                color: getSeverityColor(compositeRisk >= 0.75 ? 'critical' : compositeRisk >= 0.5 ? 'high' : 'low'),
                margin: '4px 0',
              }}
            >
              {formatPercent(compositeRisk)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <Badge variant={policy.color as any}>{policy.action}</Badge>
              <span style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary }}>
                {policy.desc}
              </span>
            </div>
          </div>

          {/* Radar / Stacked Visualization */}
          <div style={{ minWidth: 260, backgroundColor: colors.bgTertiary, padding: spacing.md, borderRadius: 6, border: `1px solid ${colors.borderSubtle}` }}>
            <div style={{ fontSize: typography.fontSizes.xs, fontWeight: typography.fontWeights.bold, color: colors.textPrimary, marginBottom: 8 }}>
              Signal Contribution Breakdown
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textMuted }}>Voice Cloning (40%):</span>
                <strong>+{(voiceCloningScore * weights.voice * 100).toFixed(1)}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textMuted }}>Speaker Mismatch (20%):</span>
                <strong>+{(speakerMismatchScore * weights.speaker * 100).toFixed(1)}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textMuted }}>Behavioral (15%):</span>
                <strong>+{(behavioralScore * weights.behavioral * 100).toFixed(1)}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textMuted }}>Caller Reputation (15%):</span>
                <strong>+{(callerReputationScore * weights.reputation * 100).toFixed(1)}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textMuted }}>Network Trust (10%):</span>
                <strong>+{(networkAnomalyScore * weights.network * 100).toFixed(1)}%</strong>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Signal Sliders / Evaluators */}
      <Card title="Multi-Signal Weighting Matrix & Interactive Tuning">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {/* Voice Cloning Signal */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSizes.sm }}>
              <span>
                <strong>1. Deepfake Voice Cloning Probability</strong> (Weight: 40%)
              </span>
              <strong style={{ color: colors.statusCritical }}>{formatPercent(voiceCloningScore)}</strong>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={voiceCloningScore}
              onChange={(e) => setVoiceCloningScore(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: colors.accentOrange, marginTop: 4 }}
            />
          </div>

          {/* Speaker Mismatch Signal */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSizes.sm }}>
              <span>
                <strong>2. Speaker Biometric Mismatch</strong> (Weight: 20%)
              </span>
              <strong style={{ color: colors.statusCritical }}>{formatPercent(speakerMismatchScore)}</strong>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={speakerMismatchScore}
              onChange={(e) => setMismatchScore(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: colors.accentOrange, marginTop: 4 }}
            />
          </div>

          {/* Behavioral Anomaly */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSizes.sm }}>
              <span>
                <strong>3. Prosody & Conversational Anomaly</strong> (Weight: 15%)
              </span>
              <strong style={{ color: colors.statusWarning }}>{formatPercent(behavioralScore)}</strong>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={behavioralScore}
              onChange={(e) => setBehavioralScore(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: colors.accentOrange, marginTop: 4 }}
            />
          </div>

          {/* Caller Reputation */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSizes.sm }}>
              <span>
                <strong>4. Caller Carrier & Threat Intel Reputation</strong> (Weight: 15%)
              </span>
              <strong style={{ color: colors.statusWarning }}>{formatPercent(callerReputationScore)}</strong>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={callerReputationScore}
              onChange={(e) => setReputationScore(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: colors.accentOrange, marginTop: 4 }}
            />
          </div>

          {/* Network Trust */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSizes.sm }}>
              <span>
                <strong>5. Device & Network Endpoint Trust</strong> (Weight: 10%)
              </span>
              <strong style={{ color: colors.accentBlue }}>{formatPercent(networkAnomalyScore)}</strong>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={networkAnomalyScore}
              onChange={(e) => setNetworkScore(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: colors.accentOrange, marginTop: 4 }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

