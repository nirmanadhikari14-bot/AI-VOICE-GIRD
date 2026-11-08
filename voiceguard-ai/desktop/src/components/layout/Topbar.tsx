import React from 'react';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/tokens';
import { Button } from '../common/Button';

interface TopbarProps {
  analystEmail?: string;
  analystRole?: string;
  connectionStatus: 'connected' | 'polling' | 'offline';
  onSearchSubmit?: (query: string) => void;
  onRefresh?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  analystEmail = 'analyst@voiceguard.ai',
  analystRole = 'SOC Analyst',
  connectionStatus,
  onSearchSubmit,
  onRefresh,
}) => {
  const [searchValue, setSearchValue] = React.useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim() && onSearchSubmit) {
      onSearchSubmit(searchValue.trim());
    }
  };

  const handleTestNotification = async () => {
    if (window.voiceguardDesktop?.showNotification) {
      await window.voiceguardDesktop.showNotification({
        title: 'VoiceGuard SOC Alert',
        body: 'High Risk Call Detected: Synthetic voice artifact probability 96.4%',
        urgency: 'critical',
      });
    }
  };

  const statusBg =
    connectionStatus === 'connected'
      ? colors.statusSuccess
      : connectionStatus === 'polling'
      ? colors.statusWarning
      : colors.statusCritical;

  const statusText =
    connectionStatus === 'connected'
      ? 'LIVE WS'
      : connectionStatus === 'polling'
      ? 'POLLING'
      : 'OFFLINE';

  return (
    <header
      style={{
        height: 52,
        backgroundColor: colors.bgSecondary,
        borderBottom: `1px solid ${colors.borderSubtle}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `0 ${spacing.md}px`,
        gap: spacing.md,
        userSelect: 'none',
        WebkitAppRegion: 'drag',
      } as any}
    >
      {/* Search Bar (non-draggable) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          flex: 1,
          maxWidth: 450,
          WebkitAppRegion: 'no-drag',
        } as any}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
          }}
        >
          <input
            type="text"
            placeholder="Quick search calls, incidents, IOCs, alerts... (Press Enter)"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              backgroundColor: colors.bgTertiary,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: 6,
              color: colors.textPrimary,
              padding: '6px 12px 6px 32px',
              fontSize: typography.fontSizes.sm,
              outline: 'none',
              fontFamily: typography.fontFamily,
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 14,
              opacity: 0.6,
            }}
          >
            🔍
          </span>
        </div>
      </div>

      {/* Middle Status & Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          WebkitAppRegion: 'no-drag',
        } as any}
      >
        {/* Real-time Status Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: colors.bgTertiary,
            border: `1px solid ${colors.borderSubtle}`,
            padding: '4px 10px',
            borderRadius: 12,
            fontSize: typography.fontSizes.xs,
            fontWeight: typography.fontWeights.medium,
            color: colors.textSecondary,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: statusBg,
              display: 'inline-block',
              boxShadow: `0 0 6px ${statusBg}`,
            }}
          />
          <span>{statusText}</span>
        </div>

        {/* Native Notification Test Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleTestNotification}
          title="Trigger a native Windows OS desktop notification"
        >
          🔔 Test Alert
        </Button>

        {/* Refresh Button */}
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            title="Refresh current view data"
          >
            🔄
          </Button>
        )}
      </div>

      {/* Right Controls: Analyst Profile + Window Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          WebkitAppRegion: 'no-drag',
        } as any}
      >
        {/* Analyst Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
            fontSize: typography.fontSizes.xs,
            color: colors.textSecondary,
            backgroundColor: colors.bgTertiary,
            padding: '4px 10px',
            borderRadius: 6,
            border: `1px solid ${colors.borderSubtle}`,
          }}
        >
          <span style={{ fontSize: 13 }}>🛡️</span>
          <div>
            <div style={{ fontWeight: typography.fontWeights.bold, color: colors.textPrimary }}>
              {analystRole}
            </div>
            <div style={{ fontSize: 10, opacity: 0.8 }}>{analystEmail}</div>
          </div>
        </div>

        {/* Native Window Controls (Minimize / Maximize / Close) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <button
            onClick={() => window.voiceguardDesktop?.minimize()}
            title="Minimize"
            style={{
              width: 28,
              height: 28,
              backgroundColor: 'transparent',
              border: 'none',
              color: colors.textSecondary,
              cursor: 'pointer',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
            }}
          >
            🗕
          </button>
          <button
            onClick={() => window.voiceguardDesktop?.maximize()}
            title="Maximize"
            style={{
              width: 28,
              height: 28,
              backgroundColor: 'transparent',
              border: 'none',
              color: colors.textSecondary,
              cursor: 'pointer',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
            }}
          >
            🗖
          </button>
          <button
            onClick={() => window.voiceguardDesktop?.close()}
            title="Close"
            style={{
              width: 28,
              height: 28,
              backgroundColor: 'transparent',
              border: 'none',
              color: colors.statusCritical,
              cursor: 'pointer',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 'bold',
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </header>
  );
};
