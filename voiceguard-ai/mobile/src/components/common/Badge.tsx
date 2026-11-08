import React from 'react';
import { Severity } from '../../types';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface BadgeProps {
  severity?: Severity | string;
  label?: string;
  variant?: 'solid' | 'subtle';
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  severity = 'none',
  label,
  variant = 'subtle',
  style,
}) => {
  const sevKey = (severity.toLowerCase() as Severity) in tokens.severityMap
    ? (severity.toLowerCase() as keyof typeof tokens.severityMap)
    : 'none';
  const config = tokens.severityMap[sevKey];

  const text = label || config.label;

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxs,
    paddingBottom: spacing.xxs,
    paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
    borderRadius: tokens.radii.sm,
    backgroundColor: variant === 'solid' ? config.color : config.background,
    border: `1px solid ${config.border}`,
    color: variant === 'solid' ? '#ffffff' : config.color,
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    ...style,
  };

  return (
    <span style={badgeStyle} aria-label={`Severity: ${text}`}>
      {text}
    </span>
  );
};
