import React from 'react';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { tokens } from '../../theme/tokens';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  isLive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  isLive = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${spacing.base}px ${spacing.base}px`,
        backgroundColor: colors.bgPrimary,
        borderBottom: `1px solid ${colors.borderSubtle}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        {showBack && (
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.textSecondary,
              cursor: 'pointer',
              fontSize: typography.fontSizes.lg,
              padding: spacing.xs,
            }}
            aria-label="Go back"
          >
            ←
          </button>
        )}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
            <h1
              style={{
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
                color: colors.textPrimary,
                margin: 0,
              }}
            >
              {title}
            </h1>
            {isLive && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 6px',
                  borderRadius: tokens.radii.full,
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: colors.threatCritical,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.bold,
                }}
              >
                ● LIVE
              </span>
            )}
          </div>
          {subtitle && (
            <p
              style={{
                fontSize: typography.fontSizes.xs,
                color: colors.textMuted,
                margin: 0,
                marginTop: 2,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {rightAction && <div>{rightAction}</div>}
    </div>
  );
};
