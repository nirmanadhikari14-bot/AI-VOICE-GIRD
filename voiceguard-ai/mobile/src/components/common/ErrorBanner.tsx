import React from 'react';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { tokens } from '../../theme/tokens';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  isOffline?: boolean;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry, isOffline = false }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${spacing.sm}px ${spacing.base}px`,
        backgroundColor: isOffline ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
        border: `1px solid ${isOffline ? colors.warning : colors.danger}`,
        borderRadius: tokens.radii.md,
        margin: spacing.base,
      }}
      role="alert"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        <span>{isOffline ? '⚡' : '⚠️'}</span>
        <span
          style={{
            fontSize: typography.fontSizes.sm,
            color: colors.textPrimary,
          }}
        >
          {message}
        </span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            backgroundColor: 'transparent',
            border: `1px solid ${colors.textSecondary}`,
            color: colors.textPrimary,
            borderRadius: tokens.radii.sm,
            padding: `${spacing.xxs}px ${spacing.sm}px`,
            fontSize: typography.fontSizes.xs,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
};
