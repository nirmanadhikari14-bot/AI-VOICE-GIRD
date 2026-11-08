import React, { useState } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/tokens';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { ErrorBanner } from '../../components/common/Feedback';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('security@voiceguard.ai');
  const [password, setPassword] = useState('VoiceGuard2026!');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: colors.bgPrimary,
        userSelect: 'none',
      }}
    >
      <div style={{ width: '100%', maxWidth: 440, padding: spacing.lg }}>
        <div style={{ textAlign: 'center', marginBottom: spacing.lg }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: colors.accentOrange,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              marginBottom: spacing.sm,
              boxShadow: '0 8px 24px rgba(249, 115, 22, 0.35)',
            }}
          >
            🛡️
          </div>
          <h1
            style={{
              fontSize: typography.fontSizes.xxl,
              fontWeight: typography.fontWeights.bold,
              color: colors.textPrimary,
              margin: '0 0 6px 0',
            }}
          >
            VoiceGuard AI
          </h1>
          <div
            style={{
              fontSize: typography.fontSizes.sm,
              color: colors.textSecondary,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            Windows Security Operations Console
          </div>
        </div>

        <Card title="Analyst Authentication" subtitle="Sign in to access centralized SOC monitoring">
          {error && (
            <div style={{ marginBottom: spacing.md }}>
              <ErrorBanner message={error} onDismiss={() => setError(null)} />
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="Analyst Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="analyst@voiceguard.ai"
              required
              autoFocus
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />

            <div
              style={{
                backgroundColor: colors.bgTertiary,
                borderRadius: 6,
                padding: spacing.sm,
                marginBottom: spacing.md,
                fontSize: typography.fontSizes.xs,
                color: colors.textMuted,
                border: `1px solid ${colors.borderSubtle}`,
              }}
            >
              <div style={{ fontWeight: typography.fontWeights.bold, color: colors.textSecondary }}>
                Pre-configured Demo Credentials:
              </div>
              <div>Email: <code style={{ color: colors.accentOrange }}>security@voiceguard.ai</code></div>
              <div>Password: <code style={{ color: colors.accentOrange }}>VoiceGuard2026!</code></div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In to Console'}
            </Button>
          </form>
        </Card>

        <div
          style={{
            marginTop: spacing.md,
            textAlign: 'center',
            fontSize: typography.fontSizes.xs,
            color: colors.textMuted,
          }}
        >
          SIH Problem Statement: SIH26104 • Defense In-Depth SOC Console
        </div>
      </div>
    </div>
  );
};

