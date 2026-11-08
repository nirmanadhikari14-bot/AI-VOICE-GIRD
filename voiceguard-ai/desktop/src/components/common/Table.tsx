import React, { ReactNode } from 'react';
import { colors } from '../../theme/colors';
import { spacing, typography, tokens } from '../../theme/tokens';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  width?: string | number;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  style?: React.CSSProperties;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No records found',
  style,
}: TableProps<T>) {
  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        borderRadius: tokens.radii.md,
        border: `1px solid ${colors.borderSubtle}`,
        backgroundColor: colors.bgCard,
        ...style,
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: colors.bgSecondary, borderBottom: `1px solid ${colors.borderDefault}` }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  fontSize: typography.fontSizes.xs,
                  fontWeight: typography.fontWeights.bold,
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  width: col.width,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                style={{
                  borderBottom: `1px solid ${colors.borderSubtle}`,
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background-color 0.1s ease',
                }}
                onMouseEnter={(e) => {
                  if (onRowClick) e.currentTarget.style.backgroundColor = colors.bgElevated;
                }}
                onMouseLeave={(e) => {
                  if (onRowClick) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: `${spacing.sm}px ${spacing.md}px`,
                      fontSize: typography.fontSizes.sm,
                      color: colors.textPrimary,
                    }}
                  >
                    {col.render ? col.render(item) : (item as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: spacing.xl,
                  textAlign: 'center',
                  fontSize: typography.fontSizes.sm,
                  color: colors.textMuted,
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

