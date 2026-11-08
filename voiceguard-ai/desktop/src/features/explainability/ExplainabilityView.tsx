import React from 'react';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/tokens';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { exportService } from '../../services/export/exportService';

export const ExplainabilityView: React.FC = () => {
  const explanationData = {
    incidentId: 'INC-2026-0891',
    callId: 'call-active-001',
    timestamp: '2026-10-31T00:20:00Z',
    executiveSummary:
      'High-risk voice cloning attack targeting financial transfer authorization. The intercepted voice exhibited characteristic neural vocoder artifacts, rigid acoustic pitch without natural micro-tremor, and failed biometric verification against enrolled executive voiceprints.',
    observedEvidence: [
      {
        feature: 'High-Frequency Spectral Cutoff',
        observation: 'Steep brick-wall roll-off at 7.85 kHz',
        implication: 'Audio was synthesized at 16 kHz sample rate and upsampled; natural human speech on HD voice extends past 12 kHz.',
        weight: 'High (0.92)',
      },
      {
        feature: 'F0 Fundamental Frequency Stability',
        observation: 'Pitch variance variance σ = 4.2 Hz across 12-second speech burst',
        implication: 'Human vocal cords exhibit continuous micro-perturbation (jitter ~1%); artificial pitch contour is unnaturally stiff.',
        weight: 'High (0.88)',
      },
      {
        feature: 'Neural Vocoder Grid Footprint',
        observation: 'Sub-band phase continuity failure aligned with HiFi-GAN receptive field',
        implication: 'Indicates deep learning waveform generator rather than biological vocal tract.',
        weight: 'Critical (0.96)',
      },
    ],
    biometricDiscrepancy: {
      claimedSpeaker: 'Arthur Pendelton (CEO)',
      enrolledVectorHash: 'e7f8a92...b3c4',
      interceptedVectorHash: '3d2c1b0...a8f9',
      similarityScore: '0.312 (Threshold: 0.850)',
      conclusion: 'Acoustic vocal tract length and formant dispersion do not match the authorized executive profile.',
    },
    policyTriggered: [
      'RULE-VOICE-01: Synthetic probability >= 0.90 triggers Critical Severity Alert',
      'RULE-SPOOF-04: Executive impersonation attempt triggers automated prevention challenge',
      'RULE-RISK-09: Multi-modal composite risk score >= 0.80 requires immediate call intervention',
    ],
    counterfactualAnalysis:
      'If the caller voice had matched the enrolled voiceprint (cosine similarity > 0.85) and background ambient noise had satisfied typical room acoustics, the composite risk score would drop from 0.89 to 0.14 (Low Risk - Allow).',
  };

  const handleExportReport = async () => {
    await exportService.exportJson(explanationData, `xai-report-${explanationData.incidentId}.json`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
        <div>
          <h2 style={{ fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold, color: colors.textPrimary, margin: 0 }}>
            Phase 18 — Explainable AI (XAI) Forensic Dossier
          </h2>
          <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary }}>
            Interpretable, auditable, and human-in-the-loop rationale behind voice impersonation decisions
          </div>
        </div>

        <Button variant="secondary" size="sm" onClick={handleExportReport}>
          📥 Export XAI Audit Dossier
        </Button>
      </div>

      {/* Executive Summary Card */}
      <Card title="Plain-English Executive Summary">
        <div style={{ fontSize: typography.fontSizes.base, color: colors.textPrimary, lineHeight: 1.6 }}>
          {explanationData.executiveSummary}
        </div>
        <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
          <Badge variant="critical">CRITICAL THREAT</Badge>
          <Badge variant="warning">EXECUTIVE TARGETED</Badge>
          <Badge variant="info">SYNTHESIS CONFIRMED</Badge>
        </div>
      </Card>

      {/* Observed Physical & Neural Evidence */}
      <Card title="Observed Acoustic & Neural Evidence">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          {explanationData.observedEvidence.map((ev, i) => (
            <div
              key={i}
              style={{
                padding: spacing.md,
                backgroundColor: colors.bgTertiary,
                borderRadius: 6,
                border: `1px solid ${colors.borderSubtle}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.textPrimary }}>
                  {ev.feature}
                </span>
                <Badge variant="critical">{ev.weight}</Badge>
              </div>
              <div style={{ fontSize: typography.fontSizes.xs, color: colors.accentOrange, marginTop: 4 }}>
                Observation: <strong>{ev.observation}</strong>
              </div>
              <div style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 4 }}>
                Forensic Meaning: {ev.implication}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Biometric & Policy Decision Logic */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: spacing.lg }}>
        <Card title="Biometric Discrepancy Breakdown">
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, fontSize: typography.fontSizes.sm }}>
            <div>
              <span style={{ color: colors.textSecondary }}>Claimed Speaker:</span>{' '}
              <strong style={{ color: colors.textPrimary }}>{explanationData.biometricDiscrepancy.claimedSpeaker}</strong>
            </div>
            <div>
              <span style={{ color: colors.textSecondary }}>Similarity Score:</span>{' '}
              <strong style={{ color: colors.statusCritical }}>{explanationData.biometricDiscrepancy.similarityScore}</strong>
            </div>
            <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
              Enrolled Vector: <code>{explanationData.biometricDiscrepancy.enrolledVectorHash}</code>
            </div>
            <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
              Captured Vector: <code>{explanationData.biometricDiscrepancy.interceptedVectorHash}</code>
            </div>
            <div style={{ marginTop: 4, padding: spacing.sm, backgroundColor: colors.bgTertiary, borderRadius: 6, borderLeft: `3px solid ${colors.statusCritical}` }}>
              {explanationData.biometricDiscrepancy.conclusion}
            </div>
          </div>
        </Card>

        <Card title="Triggered SOC Policies & Security Rules">
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, fontSize: typography.fontSizes.xs }}>
            {explanationData.policyTriggered.map((pol, idx) => (
              <div
                key={idx}
                style={{
                  padding: spacing.sm,
                  backgroundColor: colors.bgTertiary,
                  borderRadius: 6,
                  border: `1px solid ${colors.borderSubtle}`,
                  color: colors.textPrimary,
                }}
              >
                {pol}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Counterfactual Reasoning Card */}
      <Card title="Counterfactual Decision Explanation">
        <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary, lineHeight: 1.6 }}>
          {explanationData.counterfactualAnalysis}
        </div>
      </Card>
    </div>
  );
};

