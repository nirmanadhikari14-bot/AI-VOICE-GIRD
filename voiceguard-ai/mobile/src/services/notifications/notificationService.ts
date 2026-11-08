import { apiClient } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import { secureStorage, STORAGE_KEYS } from '../secureStorage/secureStorage';
import { validatePushPayload } from '../../utils/security';

export interface NotificationHandler {
  onNotificationReceived: (payload: { type: string; reference_id: string | number; title: string }) => void;
}

class NotificationService {
  private handler: NotificationHandler | null = null;
  private isPushConfigured: boolean = false;

  public setHandler(handler: NotificationHandler) {
    this.handler = handler;
  }

  public isConfigured(): boolean {
    return this.isPushConfigured;
  }

  /**
   * Registers mobile device push token with the backend.
   * Sends device token, platform, and notification preferences.
   */
  async registerDeviceToken(token: string, platform: 'ios' | 'android' | 'web', deviceName = 'Mobile Device'): Promise<boolean> {
    try {
      if (!token) return false;
      await secureStorage.setItem(STORAGE_KEYS.DEVICE_PUSH_TOKEN, token);

      await apiClient.post(ENDPOINTS.DEVICE_REGISTER, {
        device_token: token,
        platform,
        device_name: deviceName,
        push_enabled: true,
      });

      this.isPushConfigured = true;
      return true;
    } catch {
      // Backend may be unreachable or offline
      return false;
    }
  }

  /**
   * Unregisters device token upon sign out to prevent notifications
   * being sent to a logged-out device.
   */
  async unregisterDevice(): Promise<void> {
    try {
      const token = await secureStorage.getItem(STORAGE_KEYS.DEVICE_PUSH_TOKEN);
      if (token) {
        await apiClient.delete(ENDPOINTS.DEVICE_UNREGISTER(token));
        await secureStorage.removeItem(STORAGE_KEYS.DEVICE_PUSH_TOKEN);
      }
    } catch {
      // Clean up locally even if network fails
      await secureStorage.removeItem(STORAGE_KEYS.DEVICE_PUSH_TOKEN);
    }
  }

  /**
   * Secure ingestion for incoming push payloads. Validates against schema,
   * rejects sensitive payload fields, and invokes safe handler.
   */
  handleIncomingPush(rawPayload: unknown): boolean {
    const check = validatePushPayload(rawPayload);
    if (!check.valid || !check.data) {
      return false;
    }

    if (this.handler) {
      this.handler.onNotificationReceived({
        type: check.data.type,
        reference_id: check.data.reference_id,
        title: check.data.title,
      });
    }
    return true;
  }
}

export const notificationService = new NotificationService();
