import { PushNotificationPayloadSchema } from '../api/contracts/schemas';

/**
 * Validates untrusted push notification payloads at runtime.
 * Guarantees no sensitive data (OTPs, tokens) are processed from external push events.
 */
export function validatePushPayload(rawPayload: unknown): {
  valid: boolean;
  data?: {
    type: string;
    reference_id: string | number;
    title: string;
    timestamp: string;
  };
  error?: string;
} {
  try {
    const parsed = PushNotificationPayloadSchema.parse(rawPayload);
    return { valid: true, data: parsed };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Invalid notification payload schema' };
  }
}

/**
 * Sanitizes user text to prevent control character injection.
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
}
