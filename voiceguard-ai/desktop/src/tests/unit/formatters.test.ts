/**
 * Unit Tests: Formatters & Utility Functions
 * Tests getSeverityColor, formatPercent, formatRelativeTime, formatDateTime, formatDuration
 */

import {
  getSeverityColor,
  formatPercent,
  formatRelativeTime,
  formatDateTime,
  formatDuration,
  maskPhoneNumber,
} from '../../utils/formatters';

describe('getSeverityColor', () => {
  it('returns red for critical', () => {
    const color = getSeverityColor('critical');
    expect(color).toBe('#ef4444');
  });

  it('returns orange for high', () => {
    const color = getSeverityColor('high');
    expect(color).toBe('#f97316');
  });

  it('returns amber for medium', () => {
    const color = getSeverityColor('medium');
    expect(color).toBe('#f59e0b');
  });

  it('returns green for low', () => {
    const color = getSeverityColor('low');
    expect(color).toBe('#10b981');
  });

  it('returns gray for unknown/none', () => {
    const color = getSeverityColor('none');
    expect(color).toBe('#6b7280');
  });

  it('is case-insensitive', () => {
    expect(getSeverityColor('CRITICAL')).toBe('#ef4444');
    expect(getSeverityColor('High')).toBe('#f97316');
  });
});

describe('formatPercent', () => {
  it('converts 0-1 float to percentage string', () => {
    expect(formatPercent(0.94)).toBe('94%');
    expect(formatPercent(0.5)).toBe('50%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(1)).toBe('100%');
  });

  it('handles already-percentage values (> 1)', () => {
    expect(formatPercent(75)).toBe('75%');
  });

  it('rounds correctly', () => {
    expect(formatPercent(0.945)).toBe('95%');
    expect(formatPercent(0.944)).toBe('94%');
  });

  it('handles NaN gracefully', () => {
    expect(formatPercent(NaN)).toBe('0%');
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" for very recent timestamps', () => {
    const nowIso = new Date(Date.now() - 1000).toISOString();
    expect(formatRelativeTime(nowIso)).toBe('just now');
  });

  it('returns seconds ago for recent past', () => {
    const pastIso = new Date(Date.now() - 30000).toISOString(); // 30s ago
    expect(formatRelativeTime(pastIso)).toBe('30s ago');
  });

  it('returns minutes ago', () => {
    const pastIso = new Date(Date.now() - 120000).toISOString(); // 2m ago
    expect(formatRelativeTime(pastIso)).toBe('2m ago');
  });

  it('returns hours ago', () => {
    const pastIso = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    expect(formatRelativeTime(pastIso)).toBe('3h ago');
  });

  it('returns days ago for old timestamps', () => {
    const pastIso = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
    expect(formatRelativeTime(pastIso)).toBe('2d ago');
  });

  it('returns "unknown" for empty string', () => {
    expect(formatRelativeTime('')).toBe('unknown');
  });
});

describe('formatDateTime', () => {
  it('returns a formatted string for valid ISO date', () => {
    const isoDate = '2026-10-31T00:20:00.000Z';
    const result = formatDateTime(isoDate);
    // Should not be the raw ISO string
    expect(result).not.toBe(isoDate);
    expect(result).toBeTruthy();
  });

  it('returns "—" for empty string', () => {
    expect(formatDateTime('')).toBe('—');
  });
});

describe('formatDuration', () => {
  it('formats seconds to MM:SS', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(3600)).toBe('60:00');
    expect(formatDuration(90)).toBe('01:30');
  });
});

describe('maskPhoneNumber', () => {
  it('masks most of a phone number leaving last 4 digits', () => {
    // '+15551234567' is 12 chars; last 4 = '4567', first 8 = '********'
    expect(maskPhoneNumber('+15551234567')).toBe('********4567');
  });

  it('returns dash for null or undefined', () => {
    expect(maskPhoneNumber(null)).toBe('—');
    expect(maskPhoneNumber(undefined)).toBe('—');
    expect(maskPhoneNumber('')).toBe('—');
  });

  it('returns short number as-is', () => {
    expect(maskPhoneNumber('1234')).toBe('1234');
  });
});
