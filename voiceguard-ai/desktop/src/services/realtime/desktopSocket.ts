import { DESKTOP_API_CONFIG } from '../../api/endpoints';
import { desktopSecureStorage, DESKTOP_STORAGE_KEYS } from '../secureStorage/desktopSecureStorage';

export type DesktopSocketStatus = 'connected' | 'connecting' | 'disconnected' | 'polling';

export class DesktopSocketService {
  private ws: WebSocket | null = null;
  private status: DesktopSocketStatus = 'disconnected';
  private listeners: Set<(data: unknown) => void> = new Set();
  private statusListeners: Set<(st: DesktopSocketStatus) => void> = new Set();
  private pollInterval: any = null;
  private pollFn: (() => Promise<void>) | null = null;
  private reconnectTries = 0;

  public getStatus(): DesktopSocketStatus {
    return this.status;
  }

  public onStatusChange(cb: (st: DesktopSocketStatus) => void) {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  private setStatus(st: DesktopSocketStatus) {
    this.status = st;
    this.statusListeners.forEach((l) => l(st));
  }

  public subscribe(cb: (data: unknown) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private broadcast(data: unknown) {
    this.listeners.forEach((l) => {
      try {
        l(data);
      } catch {
        // Suppress callback failure
      }
    });
  }

  public async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') return;
    this.setStatus('connecting');

    const token = await desktopSecureStorage.getItem(DESKTOP_STORAGE_KEYS.AUTH_TOKEN);

    try {
      if (typeof WebSocket === 'undefined') {
        this.fallbackToPolling();
        return;
      }

      const url = `${DESKTOP_API_CONFIG.DEFAULT_WS_URL}${token ? `?token=${token}` : ''}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.reconnectTries = 0;
        this.stopPolling();
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.broadcast(parsed);
        } catch {
          this.broadcast({ raw: event.data });
        }
      };

      this.ws.onerror = () => {
        this.handleDisconnect();
      };

      this.ws.onclose = () => {
        this.handleDisconnect();
      };
    } catch {
      this.fallbackToPolling();
    }
  }

  private handleDisconnect() {
    this.setStatus('disconnected');
    if (this.reconnectTries < 3) {
      this.reconnectTries++;
      setTimeout(() => this.connect(), 2000 * this.reconnectTries);
    } else {
      this.fallbackToPolling();
    }
  }

  public setPollingFallback(fn: () => Promise<void>, intervalMs = 5000) {
    this.pollFn = fn;
    if (this.status === 'polling') {
      this.startPolling(intervalMs);
    }
  }

  private fallbackToPolling() {
    this.setStatus('polling');
    if (this.pollFn) {
      this.startPolling(5000);
    }
  }

  private startPolling(ms: number) {
    this.stopPolling();
    this.pollInterval = setInterval(async () => {
      if (this.pollFn) {
        try {
          await this.pollFn();
        } catch {
          // Polling tolerance
        }
      }
    }, ms);
  }

  public stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  public disconnect() {
    this.stopPolling();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore
      }
      this.ws = null;
    }
    this.setStatus('disconnected');
  }
}

export const desktopSocketService = new DesktopSocketService();

