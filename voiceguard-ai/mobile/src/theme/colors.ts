export const colors = {
  // VoiceGuard AI dark theme palette
  bgPrimary: '#0a0b0f',
  bgSecondary: '#0f1117',
  bgCard: '#13151c',
  bgElevated: '#1a1d27',
  borderSubtle: '#1e2130',
  borderDefault: '#252836',
  borderStrong: '#2e3347',

  // Accent colors
  accentOrange: '#f97316',
  accentOrangeGlow: 'rgba(249, 115, 22, 0.25)',
  accentBlue: '#3b82f6',
  accentCyan: '#06b6d4',
  accentGreen: '#10b981',
  accentYellow: '#f59e0b',
  accentPurple: '#8b5cf6',

  // Threat severity
  threatCritical: '#ef4444',
  threatHigh: '#f97316',
  threatMedium: '#f59e0b',
  threatLow: '#10b981',
  threatNone: '#6b7280',

  // Typography
  textPrimary: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textDisabled: '#374151',

  // States
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
} as const;

export type ColorToken = keyof typeof colors;
