import { API_CONFIG } from '../../api/endpoints';
import { secureStorage, STORAGE_KEYS } from '../secureStorage/secureStorage';

export type SocketStatus = 'connected' | 'connecting' | 'disconnected' | 'polling';

export interface RealtimeListener<T = unknown> {
  (data: T): void;
}

export class RealtimeSecurityService {
  private ws: any = null;
  private status: SocketStatus = 'disconnected';
  private listeners: Set<RealtimeListener> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 4;
  private pollingIntervalId: any = null;
  private pollingFn: (() => Promise<void>) | null = null;

  public getStatus(): SocketStatus {
    return this.status;
  }

  public subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(data: unknown) {
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch {
        // Suppress listener callback errors
      }
    });
  }

  public async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') return;

    this.status = 'connecting';
    const token = await secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

    try {
      if (typeof WebSocket === 'undefined') {
        this.fallbackToPolling();
        return;
      }

      const wsUrl = `${API_CONFIG.WS_URL}${token ? `?token=${token}` : ''}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.status = 'connected';
        this.reconnectAttempts = 0;
        this.stopPolling();
      };

      this.ws.onmessage = (event: any) => {
        try {
          const parsed = JSON.parse(event.data);
          this.notifyListeners(parsed);
        } catch {
          this.notifyListeners({ raw: event.data });
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
    this.status = 'disconnected';
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 8000);
      setTimeout(() => this.connect(), delay);
    } else {
      this.fallbackToPolling();
    }
  }

  public setPollingFallback(fn: () => Promise<void>, intervalMs = 6000) {
    this.pollingFn = fn;
    if (this.status === 'polling') {
      this.startPolling(intervalMs);
    }
  }

  private fallbackToPolling() {
    this.status = 'polling';
    if (this.pollingFn) {
      this.startPolling(6000);
    }
  }

  private startPolling(intervalMs: number) {
    this.stopPolling();
    this.pollingIntervalId = setInterval(async () => {
      if (this.pollingFn) {
        try {
          await this.pollingFn();
        } catch {
          // Bounded polling error tolerance
        }
      }
    }, intervalMs);
  }

  public stopPolling() {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
  }

  public disconnect() {
    this.stopPolling();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore close error
      }
      this.ws = null;
    }
    this.status = 'disconnected';
    this.reconnectAttempts = 0;
  }
}

export const realtimeSecurityService = new RealtimeSecurityService();
