import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('security@voiceguard.ai');
  const [password, setPassword] = useState('VoiceGuard2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide email and password');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Check credentials or backend connectivity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: colors.bgPrimary,
        color: colors.textPrimary,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: spacing.base,
      }}
    >
      <div style={{ maxWidth: 400, width: '100%', margin: '0 auto' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: spacing.xl }}>
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
            }}
          >
            🛡️
          </div>
          <h1 style={{ fontSize: typography.fontSizes.xl, fontWeight: 'bold', margin: '0 0 4px 0' }}>
            VoiceGuard AI
          </h1>
          <p style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary, margin: 0 }}>
            Enterprise Voice Cloning Impersonation Defense
          </p>
        </div>

        <Card elevated>
          {error && (
            <div
              style={{
                padding: spacing.xs,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: colors.danger,
                borderRadius: 6,
                fontSize: typography.fontSizes.xs,
                marginBottom: spacing.base,
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="SecOps Email"
              type="email"
              value={email}
              onChangeText={setEmail}
              placeholder="security@voiceguard.ai"
              autoCapitalize="none"
            />

            <Input
              label="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••••••"
            />

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              onClick={() => handleSubmit()}
              style={{ width: '100%', marginTop: spacing.sm }}
            >
              Authenticate SecOps Device
            </Button>
          </form>

          {/* Test fixture credentials hint */}
          <div
            style={{
              marginTop: spacing.base,
              padding: spacing.sm,
              backgroundColor: colors.bgSecondary,
              borderRadius: 6,
              fontSize: 11,
              color: colors.textMuted,
              lineHeight: 1.4,
            }}
          >
            🔑 <strong>Seeded Test Credentials:</strong>
            <br />
            Email: <span style={{ color: colors.accentOrange }}>security@voiceguard.ai</span>
            <br />
            Pass: <span style={{ color: colors.accentOrange }}>VoiceGuard2026!</span>
          </div>
        </Card>
      </div>
    </div>
  );
};
