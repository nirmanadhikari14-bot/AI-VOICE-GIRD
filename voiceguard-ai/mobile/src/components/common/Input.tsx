import React from 'react';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { tokens } from '../../theme/tokens';
import { typography } from '../../theme/typography';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
  style?: React.CSSProperties;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  error,
  type = 'text',
  multiline = false,
  rows = 3,
  style,
}) => {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: colors.bgSecondary,
    border: `1px solid ${error ? colors.danger : colors.borderDefault}`,
    borderRadius: tokens.radii.md,
    padding: `${spacing.sm}px ${spacing.md}px`,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.base,
    outline: 'none',
    boxSizing: 'border-box',
    ...style,
  };

  return (
    <div style={{ marginBottom: spacing.base, width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            marginBottom: spacing.xs,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.medium,
            color: colors.textSecondary,
          }}
        >
          {label}
        </label>
      )}
      {multiline ? (
        <textarea
          style={inputStyle}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder}
          rows={rows}
        />
      ) : (
        <input
          style={inputStyle}
          type={secureTextEntry ? 'password' : type}
          value={value}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={placeholder}
        />
      )}
      {error && (
        <span
          style={{
            display: 'block',
            marginTop: spacing.xxs,
            fontSize: typography.fontSizes.xs,
            color: colors.danger,
          }}
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
};
