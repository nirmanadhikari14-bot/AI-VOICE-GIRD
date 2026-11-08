import React, { ReactNode } from 'react';
import { colors } from '../../theme/colors';
import { spacing, tokens, typography } from '../../theme/tokens';

export interface CardProps {
  children: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  elevated?: boolean;
  bordered?: boolean;
  header?: ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  actions,
  onClick,
  style,
  elevated = false,
  bordered = true,
  header,
}) => {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: elevated ? colors.bgElevated : colors.bgCard,
        borderRadius: tokens.radii.md,
        border: bordered ? `1px solid ${colors.borderSubtle}` : 'none',
        padding: spacing.base,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s ease',
        ...style,
      }}
    >
      {header && <div style={{ marginBottom: spacing.sm }}>{header}</div>}

      {(title || actions) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: spacing.sm,
            gap: spacing.sm,
          }}
        >
          <div>
            {title && (
              <h3
                style={{
                  margin: 0,
                  fontSize: typography.fontSizes.base,
                  fontWeight: typography.fontWeights.bold,
                  color: colors.textPrimary,
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <div
                style={{
                  fontSize: typography.fontSizes.xs,
                  color: colors.textSecondary,
                  marginTop: 2,
                }}
              >
                {subtitle}
              </div>
            )}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}

      {children}
    </div>
  );
};
