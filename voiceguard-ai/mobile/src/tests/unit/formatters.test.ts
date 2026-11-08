import {
  getSeverityColor,
  getSeverityBackground,
  formatRelativeTime,
  formatScore,
  redactSensitiveData,
} from '../../utils/formatters';
import { colors } from '../../theme/colors';

describe('Formatters Unit Tests', () => {
  describe('getSeverityColor', () => {
    it('maps critical severity to critical threat color', () => {
      expect(getSeverityColor('critical')).toBe(colors.threatCritical);
    });

    it('maps high severity to high threat color', () => {
      expect(getSeverityColor('high')).toBe(colors.threatHigh);
    });

    it('maps medium severity to medium threat color', () => {
      expect(getSeverityColor('medium')).toBe(colors.threatMedium);
    });

    it('maps low severity to low threat color', () => {
      expect(getSeverityColor('low')).toBe(colors.threatLow);
    });

    it('defaults unknown severity to threat none', () => {
      expect(getSeverityColor('unknown_val')).toBe(colors.threatNone);
    });
  });

  describe('formatScore', () => {
    it('formats numeric scores with percentage', () => {
      expect(formatScore(94.2)).toBe('94%');
      expect(formatScore(0)).toBe('0%');
      expect(formatScore(100)).toBe('100%');
    });

    it('handles null and undefined gracefully', () => {
      expect(formatScore(null)).toBe('N/A');
      expect(formatScore(undefined)).toBe('N/A');
      expect(formatScore(NaN)).toBe('N/A');
    });
  });

  describe('formatRelativeTime', () => {
    it('returns valid relative string', () => {
      const nowIso = new Date().toISOString();
      expect(formatRelativeTime(nowIso)).toBe('just now');

      const pastIso = new Date(Date.now() - 120000).toISOString();
      expect(formatRelativeTime(pastIso)).toBe('2m ago');
    });
  });

  describe('redactSensitiveData', () => {
    it('redacts Bearer authorization tokens', () => {
      const log = 'Request with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.secret';
      const cleaned = redactSensitiveData(log);
      expect(cleaned).not.toContain('eyJhbGci');
      expect(cleaned).toContain('[REDACTED_TOKEN]');
    });

    it('redacts Social Security Numbers', () => {
      const text = 'Caller asked for SSN 123-45-6789 to verify identity';
      const cleaned = redactSensitiveData(text);
      expect(cleaned).toContain('[REDACTED_SSN]');
      expect(cleaned).not.toContain('123-45-6789');
    });
  });
});
