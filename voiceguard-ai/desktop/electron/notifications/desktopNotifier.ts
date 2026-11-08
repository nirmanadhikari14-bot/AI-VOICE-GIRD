import { Notification } from 'electron';

export interface NotificationPayload {
  title: string;
  body: string;
  urgency?: 'normal' | 'critical' | 'low';
}

export function showDesktopNotification(payload: NotificationPayload): boolean {
  if (!Notification.isSupported()) {
    return false;
  }

  // Validate payload to prevent malicious formatting
  const sanitizedTitle = String(payload.title || 'VoiceGuard Security Alert').slice(0, 100);
  const sanitizedBody = String(payload.body || '').slice(0, 300);

  const notification = new Notification({
    title: sanitizedTitle,
    body: sanitizedBody,
    urgency: payload.urgency || 'normal',
    silent: false,
  });

  notification.show();
  return true;
}

