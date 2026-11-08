import React from 'react';
import { colors } from '../../theme/colors';
import { tokens } from '../../theme/tokens';
import { spacing } from '../../theme/spacing';

interface SkeletonProps {
  height?: number | string;
  width?: number | string;
  borderRadius?: number;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  height = 20,
  width = '100%',
  borderRadius = tokens.radii.md,
  style,
}) => {
  return (
    <div
      style={{
        height,
        width,
        borderRadius,
        backgroundColor: colors.bgElevated,
        opacity: 0.7,
        marginBottom: spacing.xs,
        animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        ...style,
      }}
      aria-hidden="true"
    />
  );
};
