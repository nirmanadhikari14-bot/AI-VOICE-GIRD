import { Severity } from '../types';
import { colors } from '../theme/colors';

export function getSeverityColor(sev: Severity | string): string {
  switch (sev?.toLowerCase()) {
    case 'critical':
      return colors.threatCritical;
    case 'high':
      return colors.threatHigh;
    case 'medium':
      return colors.threatMedium;
    case 'low':
      return colors.threatLow;
    default:
      return colors.threatNone;
  }
}

export function formatPercent(val: number): string {
  if (val === null || val === undefined || isNaN(val)) return '0%';
  const num = val <= 1 ? val * 100 : val;
  return `${Math.round(num)}%`;
}

export function formatRelativeTime(isoString: string): string {
  if (!isoString) return 'unknown';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    if (diffMs <= 5000) return 'just now';
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'invalid date';
  }
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return isoString;
  }
}

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) return 'N/A';
  return `${Math.round(score)}%`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '—';
  if (phone.length <= 4) return phone;
  const visible = phone.slice(-4);
  const masked = '*'.repeat(phone.length - 4);
  return `${masked}${visible}`;
}
