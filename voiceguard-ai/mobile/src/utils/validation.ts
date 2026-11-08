export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function isValidInteractionType(type: string): boolean {
  return ['call', 'voice_note', 'money_request', 'otp_request', 'impersonation'].includes(type);
}

export function validateReportInput(data: {
  interaction_type: string;
  description: string;
  reason: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!isValidInteractionType(data.interaction_type)) {
    errors.interaction_type = 'Please select a valid interaction category';
  }
  if (!data.description || data.description.trim().length < 10) {
    errors.description = 'Please provide a detailed description (at least 10 characters)';
  }
  if (!data.reason || data.reason.trim().length < 3) {
    errors.reason = 'Please explain the reason for suspicion';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
