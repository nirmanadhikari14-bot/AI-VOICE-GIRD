import { validatePushPayload, sanitizeInput } from '../../utils/security';

describe('Security Payload & Input Tests', () => {
  describe('validatePushPayload', () => {
    it('accepts valid conformant push notifications', () => {
      const payload = {
        type: 'voice_clone',
        reference_id: 104,
        title: 'Suspected synthetic voice attack in progress',
        timestamp: new Date().toISOString(),
      };
      const res = validatePushPayload(payload);
      expect(res.valid).toBe(true);
      expect(res.data?.reference_id).toBe(104);
    });

    it('rejects untrusted push payloads with invalid type', () => {
      const payload = {
        type: 'unauthorized_arbitrary_eval',
        reference_id: 'some_id',
        title: 'Malicious title',
        timestamp: 'now',
      };
      const res = validatePushPayload(payload);
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('rejects push payload missing critical fields', () => {
      const payload = {
        type: 'high_risk',
        // missing reference_id, title, timestamp
      };
      const res = validatePushPayload(payload);
      expect(res.valid).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('strips non-printable ASCII control characters', () => {
      const input = 'Suspect caller\u0000\u0007\u001B';
      const cleaned = sanitizeInput(input);
      expect(cleaned).toBe('Suspect caller');
    });
  });
});
