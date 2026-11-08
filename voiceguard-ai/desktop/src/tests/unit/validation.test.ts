/**
 * Unit Tests: Input Validation & Schema Enforcement
 */

describe('Input Validation: Email', () => {
  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  };

  it('accepts valid email addresses', () => {
    expect(validateEmail('security@voiceguard.ai')).toBe(true);
    expect(validateEmail('analyst@soc.enterprise.com')).toBe(true);
    expect(validateEmail('user+tag@domain.org')).toBe(true);
  });

  it('rejects invalid email addresses', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('notanemail')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
  });
});

describe('Input Validation: Password Strength', () => {
  const validatePassword = (pass: string): { valid: boolean; reason?: string } => {
    if (pass.length < 8) return { valid: false, reason: 'Too short' };
    if (!/[A-Z]/.test(pass)) return { valid: false, reason: 'Needs uppercase' };
    if (!/[0-9]/.test(pass)) return { valid: false, reason: 'Needs a number' };
    return { valid: true };
  };

  it('accepts strong passwords', () => {
    expect(validatePassword('VoiceGuard2026!').valid).toBe(true);
    expect(validatePassword('SoCAnalyst99').valid).toBe(true);
  });

  it('rejects short passwords', () => {
    const result = validatePassword('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Too short');
  });

  it('rejects all-lowercase', () => {
    const result = validatePassword('alllowercase1');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Needs uppercase');
  });

  it('rejects password without digits', () => {
    const result = validatePassword('AllLettersOnly!');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Needs a number');
  });
});

describe('Input Validation: Phone Number Sanitization', () => {
  const sanitizePhone = (phone: string): string => {
    return phone.replace(/[^\d+\-() ]/g, '').trim();
  };

  it('strips disallowed characters while preserving valid ones', () => {
    expect(sanitizePhone('+1 (555) 234-5678')).toBe('+1 (555) 234-5678');
    expect(sanitizePhone('+15552345678<script>')).toBe('+15552345678');
    // Letters and SQL keywords are stripped; spaces, digits, -, +, (), remain
    const result = sanitizePhone('555; DROP TABLE calls; --');
    expect(result).toMatch(/^[\d+\-() ]*$/);
  });
});

describe('Input Validation: Threat Indicator Type Allowlist', () => {
  const ALLOWED_IOC_TYPES = new Set(['phone', 'ip', 'voice_hash', 'carrier', 'domain']);

  const isValidIocType = (type: string): boolean => ALLOWED_IOC_TYPES.has(type);

  it('accepts whitelisted IOC types', () => {
    expect(isValidIocType('phone')).toBe(true);
    expect(isValidIocType('ip')).toBe(true);
    expect(isValidIocType('voice_hash')).toBe(true);
  });

  it('rejects arbitrary strings', () => {
    expect(isValidIocType('sql_injection')).toBe(false);
    expect(isValidIocType('')).toBe(false);
    expect(isValidIocType('<script>')).toBe(false);
    expect(isValidIocType('__proto__')).toBe(false);
  });
});

describe('Input Validation: Severity Allowlist', () => {
  const SEVERITIES = new Set(['critical', 'high', 'medium', 'low', 'none']);

  it('accepts known severities', () => {
    expect(SEVERITIES.has('critical')).toBe(true);
    expect(SEVERITIES.has('low')).toBe(true);
  });

  it('rejects invalid severities', () => {
    expect(SEVERITIES.has('catastrophic')).toBe(false);
    expect(SEVERITIES.has('')).toBe(false);
    expect(SEVERITIES.has('CRITICAL')).toBe(false); // Case-sensitive set
  });
});

describe('Input Validation: Risk Score Range', () => {
  const isValidRiskScore = (score: number): boolean =>
    typeof score === 'number' && !isNaN(score) && score >= 0 && score <= 1;

  it('accepts valid 0-1 scores', () => {
    expect(isValidRiskScore(0)).toBe(true);
    expect(isValidRiskScore(0.5)).toBe(true);
    expect(isValidRiskScore(1)).toBe(true);
    expect(isValidRiskScore(0.942)).toBe(true);
  });

  it('rejects out-of-range scores', () => {
    expect(isValidRiskScore(-0.1)).toBe(false);
    expect(isValidRiskScore(1.01)).toBe(false);
    expect(isValidRiskScore(NaN)).toBe(false);
  });
});
