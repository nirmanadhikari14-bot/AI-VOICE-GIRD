import React, { useState } from 'react';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/tokens';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

export const VoiceForensicsView: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<'ensemble' | 'vocoder' | 'spectral'>('ensemble');

  const forensicMetrics = [
    { name: 'Neural Vocoder Artifacts', value: '0.942', status: 'critical', desc: 'High confidence diffusion/GAN reconstruction pattern detected' },
    { name: 'Acoustic Jitter (Cycle-to-Cycle)', value: '0.04%', status: 'warning', desc: 'Unnatural robotic pitch stability (human baseline: 0.5% - 1.2%)' },
    { name: 'Acoustic Shimmer (Amplitude Perturbation)', value: '0.12 dB', status: 'warning', desc: 'Artificially smoothed amplitude dynamics' },
    { name: 'Harmonic-to-Noise Ratio (HNR)', value: '31.4 dB', status: 'neutral', desc: 'Absence of expected micro-turbulent vocal tract noise' },
    { name: 'High-Frequency Spectral Cutoff', value: '7,850 Hz', status: 'critical', desc: 'Sharp roll-off characteristic of 16kHz upsampled synthetic models' },
    { name: 'Phase Discontinuity Index', value: '0.86', status: 'critical', desc: 'Window boundary phase anomalies detected across speech frames' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
        <div>
          <h2 style={{ fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold, color: colors.textPrimary, margin: 0 }}>
            Deepfake Voice Forensics & Acoustic Analysis (Phase 7)
          </h2>
          <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary }}>
            Raw acoustic feature inspection, vocoder footprint decomposition, and spectral energy inspection
          </div>
        </div>

        <div style={{ display: 'flex', gap: spacing.xs }}>
          <Button variant={selectedModel === 'ensemble' ? 'primary' : 'ghost'} size="sm" onClick={() => setSelectedModel('ensemble')}>
            Ensemble Model
          </Button>
          <Button variant={selectedModel === 'vocoder' ? 'primary' : 'ghost'} size="sm" onClick={() => setSelectedModel('vocoder')}>
            Vocoder Detector
          </Button>
          <Button variant={selectedModel === 'spectral' ? 'primary' : 'ghost'} size="sm" onClick={() => setSelectedModel('spectral')}>
            Spectral Roll-off
          </Button>
        </div>
      </div>

      {/* Primary Detection Banner */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
              <span style={{ fontSize: 24 }}>🚨</span>
              <span style={{ fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, color: colors.statusCritical }}>
                SYNTHETIC SPEECH CLONING DETECTED (96.4% CONFIDENCE)
              </span>
            </div>
            <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary, marginTop: 4 }}>
              Architecture signature matched: <strong>Bark / XTTSv2 autoregressive synthesis + HiFi-GAN Vocoder</strong>
            </div>
          </div>

          <Badge variant="critical">CRITICAL ANOMALY</Badge>
        </div>
      </Card>

      {/* Forensic Visualizers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: spacing.lg }}>
        {/* Mel-Spectrogram Heatmap Simulation */}
        <Card title="Mel-Frequency Spectrogram (0 - 8000 Hz)" subtitle="High-frequency roll-off and synthetic comb filtering patterns">
          <div
            style={{
              height: 200,
              backgroundColor: '#0a0a14',
              borderRadius: 6,
              border: `1px solid ${colors.borderSubtle}`,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: spacing.sm,
            }}
          >
            {/* Synthetic spectrogram representation bands */}
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', gap: 2 }}>
              {Array.from({ length: 48 }).map((_, i) => {
                const heightPercent = 25 + Math.sin(i * 0.4) * 20 + ((i % 5) * 12);
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${heightPercent}%`,
                      background: `linear-gradient(to top, #7c3aed, #ea580c, #facc15)`,
                      borderRadius: 1,
                      opacity: 0.85,
                    }}
                  />
                );
              })}
            </div>

            {/* Cutoff Annotation Line */}
            <div
              style={{
                position: 'absolute',
                top: 40,
                left: 0,
                right: 0,
                borderTop: '2px dashed #ef4444',
                paddingLeft: 8,
                fontSize: 10,
                color: '#ef4444',
                fontWeight: 'bold',
              }}
            >
              Synthetic Cutoff Threshold: ~7,850 Hz (Nyquist boundary artifact)
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
            <span>0.0s (Call Start)</span>
            <span>Spectral Energy Distribution</span>
            <span>12.4s (Interception Window)</span>
          </div>
        </Card>

        {/* Pitch Tracking (F0) & Cadence Analysis */}
        <Card title="Fundamental Frequency (F0) Tracking" subtitle="Robotic pitch flatness and micro-inflection absence">
          <div
            style={{
              height: 200,
              backgroundColor: '#0a0a14',
              borderRadius: 6,
              border: `1px solid ${colors.borderSubtle}`,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              padding: spacing.md,
            }}
          >
            {/* SVG pitch curve comparison: Human vs Synthetic */}
            <svg width="100%" height="100%" viewBox="0 0 400 160" preserveAspectRatio="none">
              {/* Human baseline reference (gray dashed) */}
              <path
                d="M 10 110 Q 50 40, 100 90 T 200 70 T 300 120 T 390 80"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              {/* Intercepted synthetic audio pitch (orange solid - flat/stiff) */}
              <path
                d="M 10 90 L 80 88 L 150 92 L 230 89 L 310 91 L 390 90"
                fill="none"
                stroke="#f97316"
                strokeWidth="3"
              />
            </svg>
            <div style={{ position: 'absolute', bottom: 10, right: 12, display: 'flex', gap: 12, fontSize: 10 }}>
              <span style={{ color: '#64748b' }}>--- Natural Human F0 Contour</span>
              <span style={{ color: '#f97316' }}>— Intercepted Audio Pitch (Rigid)</span>
            </div>
          </div>
          <div style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginTop: 8 }}>
            Standard deviation of F0 is <strong>4.2 Hz</strong> (Human baseline: 28.5 Hz). Indicates rigid neural prosody synthesis.
          </div>
        </Card>
      </div>

      {/* Forensic Parameter Breakdown Grid */}
      <Card title="Detailed Acoustic & Neural Artifact Telemetry">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: spacing.md }}>
          {forensicMetrics.map((m, idx) => (
            <div
              key={idx}
              style={{
                padding: spacing.md,
                backgroundColor: colors.bgTertiary,
                borderRadius: 6,
                border: `1px solid ${colors.borderSubtle}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.medium, color: colors.textPrimary }}>
                  {m.name}
                </span>
                <Badge variant={m.status as any}>{m.value}</Badge>
              </div>
              <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: 6 }}>
                {m.desc}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

