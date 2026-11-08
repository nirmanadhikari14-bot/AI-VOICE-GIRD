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

export function getSeverityBackground(sev: Severity | string): string {
  switch (sev?.toLowerCase()) {
    case 'critical':
      return 'rgba(239, 68, 68, 0.15)';
    case 'high':
      return 'rgba(249, 115, 22, 0.15)';
    case 'medium':
      return 'rgba(245, 158, 11, 0.15)';
    case 'low':
      return 'rgba(16, 185, 129, 0.15)';
    default:
      return 'rgba(107, 114, 128, 0.15)';
  }
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

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) return 'N/A';
  return `${Math.round(score)}%`;
}

/**
 * Redacts tokens, passwords, and sensitive information from telemetry or display.
 */
export function redactSensitiveData(text: string): string {
  if (!text) return '';
  // Redact bearer tokens
  let cleaned = text.replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer [REDACTED_TOKEN]');
  // Redact credit cards/SSNs
  cleaned = cleaned.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]');
  cleaned = cleaned.replace(/\b(?:\d{4}[ -]?){3}\d{4}\b/g, '[REDACTED_CARD]');
  return cleaned;
}
