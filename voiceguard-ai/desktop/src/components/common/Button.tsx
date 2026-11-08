import React, { ReactNode } from 'react';
import { colors } from '../../theme/colors';
import { spacing, typography, tokens } from '../../theme/tokens';

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  style,
  type = 'button',
  title,
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
  } else if (variant === 'success') {
    bg = colors.success;
    textCol = '#ffffff';
  } else if (variant === 'ghost') {
    bg = 'transparent';
    textCol = colors.textSecondary;
  }

  const paddingMap = {
    sm: '4px 10px',
    md: '7px 14px',
    lg: '10px 20px',
  };

  return (
    <button
      type={type}
      title={title}
      onClick={!disabled && !loading ? onClick : undefined}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        width: fullWidth ? '100%' : undefined,
        backgroundColor: disabled ? colors.textDisabled : bg,
        color: disabled ? colors.textMuted : textCol,
        border,
        borderRadius: tokens.radii.sm,
        padding: paddingMap[size],
        fontSize: size === 'sm' ? typography.fontSizes.xs : typography.fontSizes.sm,
        fontWeight: typography.fontWeights.semibold,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'background-color 0.15s ease',
        outline: 'none',
        ...style,
      }}
    >
      {loading ? 'Processing...' : children}
    </button>
  );
};

