import React, { ReactNode } from 'react';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  style,
  type = 'button',
  accessibilityLabel,
}) => {
  let bg: string = colors.accentOrange;
  let textCol: string = '#ffffff';
  let border: string = 'none';

  if (variant === 'secondary') {
    bg = colors.bgElevated;
    textCol = colors.textPrimary;
    border = `1px solid ${colors.borderDefault}`;
  } else if (variant === 'danger') {
    bg = colors.danger;
    textCol = '#ffffff';
  } else if (variant === 'ghost') {
    bg = 'transparent';
    textCol = colors.textSecondary;
  }

  const paddingMap = {
    sm: `${spacing.xs}px ${spacing.sm}px`,
    md: `${spacing.sm}px ${spacing.base}px`,
    lg: `${spacing.md}px ${spacing.xl}px`,
  };

  const btnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: disabled ? colors.textDisabled : bg,
    color: disabled ? colors.textMuted : textCol,
    border,
    borderRadius: tokens.radii.md,
    padding: paddingMap[size],
    fontSize: size === 'sm' ? typography.fontSizes.sm : typography.fontSizes.base,
    fontWeight: typography.fontWeights.semibold,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    minHeight: 44, // Accessible touch target
    transition: 'background-color 0.15s ease',
    ...style,
  };

  return (
    <button
      type={type}
      style={btnStyle}
      onClick={!disabled && !loading ? onClick : undefined}
      disabled={disabled || loading}
      aria-label={accessibilityLabel || (typeof children === 'string' ? children : 'button')}
    >
      {loading ? 'Processing...' : children}
    </button>
  );
};
