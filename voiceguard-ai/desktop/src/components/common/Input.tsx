import React from 'react';
import { colors } from '../../theme/colors';
import { spacing, typography, tokens } from '../../theme/tokens';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  onChangeText?: (text: string) => void;
  error?: string;
  multiline?: boolean;
  rows?: number;
  inputStyle?: React.CSSProperties;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChange,
  onChangeText,
  placeholder,
  error,
  type = 'text',
  multiline = false,
  rows = 3,
  style,
  inputStyle,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e as any);
    }
    if (onChangeText) {
      onChangeText(e.target.value);
    }
  };

  const baseInputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: colors.bgSecondary,
    border: `1px solid ${error ? colors.danger : colors.borderDefault}`,
    borderRadius: tokens.radii.sm,
    padding: `${spacing.xs + 2}px ${spacing.sm}px`,
    color: colors.textPrimary,
    fontSize: typography.fontSizes.sm,
    outline: 'none',
    boxSizing: 'border-box',
    ...inputStyle,
  };

  return (
    <div style={{ marginBottom: spacing.sm, width: '100%', ...style }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: typography.fontSizes.xs,
            fontWeight: typography.fontWeights.medium,
            color: colors.textSecondary,
            marginBottom: spacing.xs,
          }}
        >
          {label}
        </label>
      )}

      {multiline ? (
        <textarea
          rows={rows}
          value={value as any}
          onChange={handleChange}
          placeholder={placeholder}
          style={{ ...baseInputStyle, resize: 'vertical' }}
        />
      ) : (
        <input
          type={type}
          value={value as any}
          onChange={handleChange}
          placeholder={placeholder}
          style={baseInputStyle}
          {...(props as any)}
        />
      )}

      {error && (
        <div style={{ color: colors.danger, fontSize: typography.fontSizes.xs, marginTop: 2 }}>
          {error}
        </div>
      )}
    </div>
  );
};
