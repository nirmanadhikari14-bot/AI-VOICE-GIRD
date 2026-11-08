import React, { ReactNode } from 'react';
import { Severity } from '../../types';
import { tokens, typography } from '../../theme/tokens';
import { colors } from '../../theme/colors';

export interface BadgeProps {
  children?: ReactNode;
  severity?: Severity | string;
  label?: string;
  variant?: 'solid' | 'subtle' | 'critical' | 'high' | 'medium' | 'low' | 'neutral' | 'success' | 'warning' | 'info' | string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  severity,
  label,
  variant = 'subtle',
  style,
}) => {
  // Infer severity from variant or severity prop
  const effectiveSeverity = (
    severity ||
    (variant !== 'solid' && variant !== 'subtle' ? variant : 'none')
  ).toLowerCase();

  const sevKey = (effectiveSeverity in tokens.severityMap
    ? effectiveSeverity
    : 'none') as keyof typeof tokens.severityMap;

  const config = tokens.severityMap[sevKey];
  const text = children || label || config.label;

  // Custom color for 'info' or 'neutral'
  let bg = config.background;
  let textCol = config.color;
  let border = config.border;

  if (effectiveSeverity === 'info') {
    bg = 'rgba(59, 130, 246, 0.15)';
    textCol = colors.accentBlue;
    border = 'rgba(59, 130, 246, 0.35)';
  } else if (effectiveSeverity === 'neutral') {
    bg = 'rgba(100, 116, 139, 0.15)';
    textCol = colors.textSecondary;
    border = 'rgba(100, 116, 139, 0.35)';
  } else if (effectiveSeverity === 'success') {
    bg = 'rgba(16, 185, 129, 0.15)';
    textCol = colors.success;
    border = 'rgba(16, 185, 129, 0.35)';
  } else if (effectiveSeverity === 'warning') {
    bg = 'rgba(245, 158, 11, 0.15)';
    textCol = colors.warning;
    border = 'rgba(245, 158, 11, 0.35)';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2px 8px',
        borderRadius: tokens.radii.sm,
        backgroundColor: variant === 'solid' ? textCol : bg,
        border: `1px solid ${border}`,
        color: variant === 'solid' ? '#ffffff' : textCol,
        fontSize: typography.fontSizes.xs,
        fontWeight: typography.fontWeights.bold,
        letterSpacing: 0.5,
        fontFamily: 'monospace',
        ...style,
      }}
      aria-label={`Badge: ${String(text)}`}
    >
      {text}
    </span>
  );
};
