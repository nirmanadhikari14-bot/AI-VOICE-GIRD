import React, { useState, useEffect } from 'react';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { useAuth } from '../../auth/AuthProvider';
import { sessionService } from '../../auth/sessionService';
import { notificationService } from '../../services/notifications/notificationService';
import { clearQueryCache } from '../../providers/QueryProvider';
import { apiClient } from '../../api/client';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface SettingsScreenProps {
  onBack?: () => void;
  onNavigate?: (screen: string) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, onNavigate }) => {
  const { user, logout } = useAuth();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pushRegistered, setPushRegistered] = useState(notificationService.isConfigured());
  const [deviceTokenInput, setDeviceTokenInput] = useState('demo-mobile-fcm-token-vg2026');
  const [apiUrl, setApiUrl] = useState(apiClient.getBaseUrl());
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    sessionService.isBiometricLockEnabled().then(setBiometricEnabled);
  }, []);

  const handleToggleBiometric = async () => {
    const nextVal = !biometricEnabled;
    setBiometricEnabled(nextVal);
    await sessionService.setBiometricLockEnabled(nextVal);
  };

  const handleRegisterDevice = async () => {
    const success = await notificationService.registerDeviceToken(
      deviceTokenInput,
      'android',
      'SecOps Primary Mobile'
    );
    setPushRegistered(success);
    setSaveMessage(success ? 'Device registered for push security alerts' : 'Registration failed');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleUpdateApiUrl = () => {
    apiClient.setBaseUrl(apiUrl);
    setSaveMessage('API Base URL updated');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleSignOut = async () => {
    await notificationService.unregisterDevice();
    await logout();
    clearQueryCache();
  };

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
      <Header title="Settings & Security" subtitle="Device Configuration & Privacy" showBack={!!onBack} onBack={onBack} />

      <div style={{ padding: spacing.base }}>
        {saveMessage && (
          <div
            style={{
              padding: spacing.xs,
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: colors.accentGreen,
              borderRadius: 6,
              marginBottom: spacing.base,
              fontSize: typography.fontSizes.xs,
            }}
          >
            {saveMessage}
          </div>
        )}

        {/* User Identity */}
        <div style={{ marginBottom: spacing.base }}>
          <h3 style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary, margin: `0 0 ${spacing.xs}px 0` }}>
            Active Session
          </h3>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: typography.fontSizes.sm, color: colors.textPrimary }}>
                  {user?.name || user?.email || 'Authenticated User'}
                </strong>
                <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                  {user?.email} • Status: {user?.status?.toUpperCase()}
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 10,
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  color: colors.accentGreen,
                  fontWeight: 'bold',
                }}
              >
                ACTIVE
              </span>
            </div>
          </Card>
        </div>

        {/* Biometrics */}
        <div style={{ marginBottom: spacing.base }}>
          <h3 style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary, margin: `0 0 ${spacing.xs}px 0` }}>
            Local App Security
          </h3>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: typography.fontSizes.sm, fontWeight: 'bold' }}>
                  Biometric App Lock
                </div>
                <div style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary }}>
                  Require Fingerprint / Face ID to open app
                </div>
              </div>
              <input
                type="checkbox"
                checked={biometricEnabled}
                onChange={handleToggleBiometric}
                style={{ width: 20, height: 20, cursor: 'pointer' }}
              />
            </div>
          </Card>
        </div>

        {/* Push Notification Device Registration */}
        <div style={{ marginBottom: spacing.base }}>
          <h3 style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary, margin: `0 0 ${spacing.xs}px 0` }}>
            Push Security Alerts Registration
          </h3>
          <Card>
            <div style={{ marginBottom: spacing.sm }}>
              <div style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginBottom: 4 }}>
                Device Registration Status:
              </div>
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 4,
                  backgroundColor: pushRegistered ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)',
                  color: pushRegistered ? colors.accentGreen : colors.textMuted,
                  fontWeight: 'bold',
                }}
              >
                {pushRegistered ? 'PUSH CHANNEL REGISTERED' : 'NOT REGISTERED'}
              </span>
            </div>

            <Input
              label="Device Push Token"
              value={deviceTokenInput}
              onChangeText={setDeviceTokenInput}
            />

            <Button
              size="sm"
              variant="secondary"
              onClick={handleRegisterDevice}
              style={{ width: '100%' }}
            >
              Update Registration Token
            </Button>
          </Card>
        </div>

        {/* Backend Connectivity */}
        <div style={{ marginBottom: spacing.base }}>
          <h3 style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary, margin: `0 0 ${spacing.xs}px 0` }}>
            Backend API Connection
          </h3>
          <Card>
            <Input
              label="API Base URL (LAN host for physical phone)"
              value={apiUrl}
              onChangeText={setApiUrl}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleUpdateApiUrl}
              style={{ width: '100%' }}
            >
              Update Server URL
            </Button>
          </Card>
        </div>

        {/* Sign Out */}
        <Button
          variant="danger"
          onClick={handleSignOut}
          style={{ width: '100%', marginTop: spacing.md }}
        >
          Sign Out of VoiceGuard AI
        </Button>
      </div>
    </div>
  );
};
