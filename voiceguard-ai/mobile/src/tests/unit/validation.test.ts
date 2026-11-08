import { isValidEmail, isValidInteractionType, validateReportInput } from '../../utils/validation';

describe('Validation Unit Tests', () => {
  describe('isValidEmail', () => {
    it('validates proper email formats', () => {
      expect(isValidEmail('security@voiceguard.ai')).toBe(true);
      expect(isValidEmail('user.name+tag@sub.domain.org')).toBe(true);
    });

    it('rejects invalid email formats', () => {
      expect(isValidEmail('plainaddress')).toBe(false);
      expect(isValidEmail('@missingusername.com')).toBe(false);
      expect(isValidEmail('user@.missingdomain')).toBe(false);
    });
  });

  describe('isValidInteractionType', () => {
    it('accepts allowed threat interaction categories', () => {
      expect(isValidInteractionType('call')).toBe(true);
      expect(isValidInteractionType('voice_note')).toBe(true);
      expect(isValidInteractionType('money_request')).toBe(true);
      expect(isValidInteractionType('otp_request')).toBe(true);
      expect(isValidInteractionType('impersonation')).toBe(true);
    });

    it('rejects unrecognized categories', () => {
      expect(isValidInteractionType('unknown_type')).toBe(false);
      expect(isValidInteractionType('')).toBe(false);
    });
  });

  describe('validateReportInput', () => {
    it('passes for complete, valid reports', () => {
      const res = validateReportInput({
        interaction_type: 'call',
        description: 'Caller claimed to be CFO requesting urgent wire transfer to offshore account.',
        reason: 'Acoustic latency and metallic vocoder timbre detected.',
      });
      expect(res.valid).toBe(true);
      expect(Object.keys(res.errors)).toHaveLength(0);
    });

    it('fails when description is too short or missing', () => {
      const res = validateReportInput({
        interaction_type: 'call',
        description: 'short',
        reason: 'suspicious',
      });
      expect(res.valid).toBe(false);
      expect(res.errors.description).toBeDefined();
    });
  });
});
