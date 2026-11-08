import React from 'react';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '🛡️',
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 40, marginBottom: spacing.md }}>{icon}</div>
      <h3
        style={{
          fontSize: typography.fontSizes.base,
          fontWeight: typography.fontWeights.semibold,
          color: colors.textPrimary,
          margin: 0,
          marginBottom: spacing.xs,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: typography.fontSizes.sm,
          color: colors.textSecondary,
          margin: 0,
          marginBottom: actionLabel ? spacing.base : 0,
          maxWidth: 280,
          lineHeight: typography.lineHeights.normal,
        }}
      >
        {description}
      </p>
      {actionLabel && onAction && (
        <Button size="sm" variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
