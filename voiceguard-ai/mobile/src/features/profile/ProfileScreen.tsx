import React from 'react';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../auth/AuthProvider';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface ProfileScreenProps {
  onNavigate: (screen: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();

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
      <Header title="Security Profile" subtitle="User Credentials & Entitlements" />

      <div style={{ padding: spacing.base }}>
        <Card elevated style={{ marginBottom: spacing.base, textAlign: 'center', padding: spacing.xl }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.accentOrange,
              color: '#ffffff',
              fontSize: 28,
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <h2 style={{ fontSize: typography.fontSizes.md, fontWeight: 'bold', margin: '0 0 4px 0' }}>
            {user?.name || 'Security Operator'}
          </h2>
          <p style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary, margin: 0 }}>
            {user?.email}
          </p>
          <div style={{ marginTop: 8 }}>
            <span
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 4,
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                color: colors.accentBlue,
                fontWeight: 'bold',
              }}
            >
              ROLE ID: {user?.role_id ?? 1} (SECURITY ANALYST)
            </span>
          </div>
        </Card>

        <div style={{ marginBottom: spacing.base }}>
          <Card onClick={() => onNavigate('Settings')} style={{ marginBottom: spacing.xs }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: typography.fontSizes.sm }}>Device & Security Settings</strong>
                <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                  Biometrics, notification tokens, API host
                </div>
              </div>
              <span style={{ color: colors.accentOrange }}>→</span>
            </div>
          </Card>

          <Card onClick={() => onNavigate('ReportSuspicious')} style={{ marginBottom: spacing.xs }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: typography.fontSizes.sm }}>Submit Telephony Threat Report</strong>
                <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                  Report suspected voice cloning interaction
                </div>
              </div>
              <span style={{ color: colors.accentOrange }}>→</span>
            </div>
          </Card>
        </div>

        <Button variant="danger" onClick={logout} style={{ width: '100%' }}>
          Sign Out
        </Button>
      </div>
    </div>
  );
};
