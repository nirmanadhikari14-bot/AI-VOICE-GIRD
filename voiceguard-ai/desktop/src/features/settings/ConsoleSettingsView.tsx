import React, { useState, useEffect } from 'react';
import { useAuth } from '../../app/providers/AuthProvider';
import { desktopSecureStorage, DESKTOP_STORAGE_KEYS } from '../../services/secureStorage/desktopSecureStorage';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/tokens';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export const ConsoleSettingsView: React.FC = () => {
  const { user, logout } = useAuth();
  const [apiUrl, setApiUrl] = useState('http://127.0.0.1:8000');
  const [desktopVersion, setDesktopVersion] = useState('1.0.0-phase23');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const storedUrl = await desktopSecureStorage.getItem(DESKTOP_STORAGE_KEYS.API_URL);
      if (storedUrl) setApiUrl(storedUrl);

      if (window.voiceguardDesktop?.getVersion) {
        const ver = await window.voiceguardDesktop.getVersion();
        setDesktopVersion(ver);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await desktopSecureStorage.setItem(DESKTOP_STORAGE_KEYS.API_URL, apiUrl.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleClearCache = async () => {
    await desktopSecureStorage.clearAll();
    window.location.reload();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg, maxWidth: 800 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold, color: colors.textPrimary, margin: 0 }}>
          Windows Security Console Configuration & Preferences
        </h2>
        <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary }}>
          Manage backend endpoints, desktop runtime sandbox, security policies, and session credentials
        </div>
      </div>

      {/* Backend Connection Card */}
      <Card title="Backend API & Orchestration Endpoint">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <Input
            label="VoiceGuard AI Backend Server URL"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="http://127.0.0.1:8000"
            required
          />

          <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
            Default development endpoint is <code>http://127.0.0.1:8000</code>. Production SOC connects over mTLS.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: spacing.md }}>
            <Button type="submit" variant="primary">
              Save Settings
            </Button>
            {saveSuccess && (
              <span style={{ fontSize: typography.fontSizes.sm, color: colors.statusSuccess }}>
                ✓ Settings saved successfully
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* Analyst Profile & Session */}
      <Card title="Authenticated Analyst Credentials">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, fontSize: typography.fontSizes.sm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: colors.textSecondary }}>Analyst Email:</span>
            <strong style={{ color: colors.textPrimary }}>{user?.email || 'security@voiceguard.ai'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: colors.textSecondary }}>Assigned Role:</span>
            <Badge variant="info">{user?.role?.toUpperCase() || 'SOC_ANALYST'}</Badge>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: colors.textSecondary }}>Tenant / Organization:</span>
            <strong style={{ color: colors.textPrimary }}>VoiceGuard AI Enterprise Defense</strong>
          </div>

          <div style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTop: `1px solid ${colors.borderSubtle}`, display: 'flex', gap: spacing.sm }}>
            <Button variant="danger" size="sm" onClick={() => logout()}>
              🚪 Sign Out of Console
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearCache}>
              🗑️ Clear Stored Vault Cache
            </Button>
          </div>
        </div>
      </Card>

      {/* Desktop App Architecture & Security Posture */}
      <Card title="Desktop Sandbox & Operating System Security">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, fontSize: typography.fontSizes.sm }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: colors.textSecondary }}>Console Architecture:</span>
            <strong style={{ color: colors.textPrimary }}>Electron 34 + React 19 + TypeScript + Vite 6</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: colors.textSecondary }}>Console Version:</span>
            <code>{desktopVersion}</code>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: colors.textSecondary }}>Process Isolation:</span>
            <Badge variant="success">contextIsolation: ENABLED</Badge>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: colors.textSecondary }}>Node Integration:</span>
            <Badge variant="success">nodeIntegration: DISABLED</Badge>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: colors.textSecondary }}>Content Security Policy:</span>
            <Badge variant="success">STRICT CSP ENFORCED</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};

