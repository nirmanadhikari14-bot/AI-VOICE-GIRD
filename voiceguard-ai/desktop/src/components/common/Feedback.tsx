import React from 'react';
import { colors } from '../../theme/colors';
import { spacing, tokens } from '../../theme/tokens';

export const Skeleton: React.FC<{ height?: number | string; width?: number | string; style?: React.CSSProperties }> = ({
  height = 20,
  width = '100%',
  style,
}) => (
  <div
    style={{
      height,
      width,
      borderRadius: tokens.radii.sm,
      backgroundColor: colors.bgElevated,
      opacity: 0.6,
      marginBottom: spacing.xs,
      animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      ...style,
    }}
  />
);

export const EmptyState: React.FC<{
  icon?: string;
  title: string;
  description: string;
  actionText?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({
  icon = '🛡️',
  title,
  description,
  actionText,
  actionLabel,
  onAction,
}) => {
  const label = actionText || actionLabel;

  return (
    <div style={{ textAlign: 'center', padding: spacing.xl }}>
      <div style={{ fontSize: 36, marginBottom: spacing.xs }}>{icon}</div>
      <h3 style={{ fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, margin: '0 0 4px 0' }}>{title}</h3>
      <p style={{ fontSize: 13, color: colors.textMuted, margin: '0 0 12px 0', maxWidth: 360, marginInline: 'auto' }}>
        {description}
      </p>
      {label && onAction && (
        <button
          onClick={onAction}
          style={{
            padding: '6px 14px',
            backgroundColor: colors.bgElevated,
            color: colors.textPrimary,
            border: `1px solid ${colors.borderDefault}`,
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {label}
        </button>
      )}
    </div>
  );
};

export const ErrorBanner: React.FC<{ message: string; onRetry?: () => void; onDismiss?: () => void }> = ({
  message,
  onRetry,
  onDismiss,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 14px',
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      border: `1px solid ${colors.danger}`,
      borderRadius: tokens.radii.sm,
      marginBottom: spacing.sm,
      color: colors.textPrimary,
      fontSize: 13,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
      <span>⚠️</span>
      <span>{message}</span>
    </div>
    <div style={{ display: 'flex', gap: spacing.xs }}>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: 'transparent',
            border: `1px solid ${colors.textSecondary}`,
            color: colors.textPrimary,
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.textMuted,
            padding: '2px 6px',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      )}
    </div>
  </div>
);
