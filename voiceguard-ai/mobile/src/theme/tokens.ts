import { colors } from './colors';

export const tokens = {
  radii: {
    none: 0,
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    full: 9999,
  },
  iconSizes: {
    xs: 14,
    sm: 18,
    md: 22,
    lg: 26,
    xl: 32,
  },
  animationDuration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  severityMap: {
    critical: {
      color: colors.threatCritical,
      background: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.35)',
      label: 'CRITICAL',
    },
    high: {
      color: colors.threatHigh,
      background: 'rgba(249, 115, 22, 0.12)',
      border: 'rgba(249, 115, 22, 0.35)',
      label: 'HIGH',
    },
    medium: {
      color: colors.threatMedium,
      background: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.35)',
      label: 'MEDIUM',
    },
    low: {
      color: colors.threatLow,
      background: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.35)',
      label: 'LOW',
    },
    none: {
      color: colors.threatNone,
      background: 'rgba(107, 114, 128, 0.12)',
      border: 'rgba(107, 114, 128, 0.25)',
      label: 'NONE',
    },
  },
};
