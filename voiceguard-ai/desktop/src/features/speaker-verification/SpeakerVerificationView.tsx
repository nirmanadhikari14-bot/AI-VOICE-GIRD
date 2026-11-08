import React, { useState } from 'react';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/tokens';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const SpeakerVerificationView: React.FC = () => {
  const [selectedProfile, setSelectedProfile] = useState<'ceo' | 'cfo' | 'cto'>('ceo');

  const profiles = {
    ceo: {
      name: 'Arthur Pendelton',
      role: 'Chief Executive Officer',
      enrolledSamples: 14,
      enrollmentDate: '2026-08-15',
      modelArchitecture: 'ECAPA-TDNN (192-dim embeddings)',
      claimedCaller: '+1 (555) 234-5678',
      similarityScore: 0.312,
      decisionThreshold: 0.85,
      confidence: '98.8% Discrepancy',
      result: 'REJECTED_MISMATCH',
    },
    cfo: {
      name: 'Eleanor Vance',
      role: 'Chief Financial Officer',
      enrolledSamples: 8,
      enrollmentDate: '2026-09-02',
      modelArchitecture: 'ECAPA-TDNN (192-dim embeddings)',
      claimedCaller: '+1 (555) 987-6543',
      similarityScore: 0.441,
      decisionThreshold: 0.85,
      confidence: '94.2% Discrepancy',
      result: 'REJECTED_MISMATCH',
    },
    cto: {
      name: 'David Zhao',
      role: 'VP of Engineering',
      enrolledSamples: 12,
      enrollmentDate: '2026-07-20',
      modelArchitecture: 'ECAPA-TDNN (192-dim embeddings)',
      claimedCaller: '+1 (555) 432-1098',
      similarityScore: 0.892,
      decisionThreshold: 0.85,
      confidence: '96.1% Match',
      result: 'VERIFIED_AUTHENTIC',
    },
  };

  const current = profiles[selectedProfile];
  const isMatch = current.result === 'VERIFIED_AUTHENTIC';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
        <div>
          <h2 style={{ fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold, color: colors.textPrimary, margin: 0 }}>
            Biometric Speaker Verification & Voiceprint Matching (Phase 8)
          </h2>
          <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary }}>
            Deep speaker embeddings, enrolled voiceprint database, and cosine similarity scoring
          </div>
        </div>

        {/* Profile Selector */}
        <div style={{ display: 'flex', gap: spacing.xs }}>
          <Button variant={selectedProfile === 'ceo' ? 'primary' : 'ghost'} size="sm" onClick={() => setSelectedProfile('ceo')}>
            Target: CEO Arthur P.
          </Button>
          <Button variant={selectedProfile === 'cfo' ? 'primary' : 'ghost'} size="sm" onClick={() => setSelectedProfile('cfo')}>
            Target: CFO Eleanor V.
          </Button>
          <Button variant={selectedProfile === 'cto' ? 'primary' : 'ghost'} size="sm" onClick={() => setSelectedProfile('cto')}>
            Target: VP David Z.
          </Button>
        </div>
      </div>

      {/* Main Verification Status Card */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: isMatch ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: isMatch ? colors.statusSuccess : colors.statusCritical,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
              }}
            >
              {isMatch ? '👤✓' : '👤⚠️'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <span style={{ fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, color: colors.textPrimary }}>
                  {current.name}
                </span>
                <Badge variant={isMatch ? 'success' : 'critical'}>
                  {current.result.replace('_', ' ')}
                </Badge>
              </div>
              <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary }}>
                {current.role} • Claimed Caller: <strong>{current.claimedCaller}</strong>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>Embedding Similarity</div>
            <div
              style={{
                fontSize: typography.fontSizes.xxl,
                fontWeight: typography.fontWeights.bold,
                color: isMatch ? colors.statusSuccess : colors.statusCritical,
              }}
            >
              {current.similarityScore.toFixed(3)}
            </div>
            <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
              Required Threshold: {current.decisionThreshold.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Visual Cosine Distance Bar */}
        <div style={{ marginTop: spacing.lg }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSizes.xs, color: colors.textMuted, marginBottom: 4 }}>
            <span>0.0 (Complete Divergence)</span>
            <span style={{ color: colors.statusWarning }}>Threshold: 0.85</span>
            <span>1.0 (Identical Voiceprint)</span>
          </div>

          <div
            style={{
              position: 'relative',
              height: 12,
              backgroundColor: colors.bgTertiary,
              borderRadius: 6,
              overflow: 'hidden',
              border: `1px solid ${colors.borderSubtle}`,
            }}
          >
            {/* Score fill */}
            <div
              style={{
                width: `${current.similarityScore * 100}%`,
                height: '100%',
                backgroundColor: isMatch ? colors.statusSuccess : colors.statusCritical,
                transition: 'width 0.4s ease',
              }}
            />
            {/* Threshold marker */}
            <div
              style={{
                position: 'absolute',
                left: '85%',
                top: 0,
                bottom: 0,
                width: 2,
                backgroundColor: '#ffffff',
                boxShadow: '0 0 4px #ffffff',
              }}
            />
          </div>
        </div>
      </Card>

      {/* Vector Embeddings Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: spacing.lg }}>
        <Card title="Enrolled Voiceprint Profile">
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, fontSize: typography.fontSizes.sm }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: colors.textSecondary }}>Enrollment Corpus:</span>
              <strong style={{ color: colors.textPrimary }}>{current.enrolledSamples} Clean Reference Audio Tracks</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: colors.textSecondary }}>Embedding Architecture:</span>
              <strong style={{ color: colors.textPrimary }}>{current.modelArchitecture}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: colors.textSecondary }}>Enrollment Verified:</span>
              <strong style={{ color: colors.textPrimary }}>{current.enrollmentDate}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: colors.textSecondary }}>Biometric Vector Status:</span>
              <strong style={{ color: colors.statusSuccess }}>Cryptographically Signed & Locked</strong>
            </div>
          </div>
        </Card>

        <Card title="Intercepted Audio Embedding Analysis">
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, fontSize: typography.fontSizes.sm }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: colors.textSecondary }}>Cosine Distance:</span>
              <strong style={{ color: isMatch ? colors.statusSuccess : colors.statusCritical }}>
                {(1 - current.similarityScore).toFixed(3)}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: colors.textSecondary }}>False Acceptance Risk:</span>
              <strong style={{ color: colors.textPrimary }}>&lt; 0.001% (EER: 0.82%)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: colors.textSecondary }}>Formant Dispersion (F1/F2):</span>
              <strong style={{ color: isMatch ? colors.textPrimary : colors.statusCritical }}>
                {isMatch ? 'Aligned with vocal tract geometry' : 'Anomalous vocal tract length'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: colors.textSecondary }}>SOC Verdict:</span>
              <strong style={{ color: isMatch ? colors.statusSuccess : colors.statusCritical }}>
                {isMatch ? 'PASSED_GENUINE_SPEAKER' : 'CRITICAL_IMPERSONATION_ATTEMPT'}
              </strong>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

