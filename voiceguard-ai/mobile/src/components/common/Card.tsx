import React, { ReactNode } from 'react';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { tokens } from '../../theme/tokens';

interface CardProps {
  children: ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  elevated?: boolean;
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  onClick,
  style,
  elevated = false,
  bordered = true,
}) => {
  const cardStyle: React.CSSProperties = {
    backgroundColor: elevated ? colors.bgElevated : colors.bgCard,
    borderRadius: tokens.radii.lg,
    border: bordered ? `1px solid ${colors.borderSubtle}` : 'none',
    padding: spacing.base,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.15s ease-in-out',
    ...style,
  };

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};
