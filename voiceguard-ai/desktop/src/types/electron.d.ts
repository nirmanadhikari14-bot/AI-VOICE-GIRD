export interface VoiceGuardDesktopApi {
  platform: string;
  getVersion: () => Promise<string>;
  showNotification: (payload: { title: string; body: string; urgency?: 'normal' | 'critical' | 'low' }) => Promise<boolean>;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  exportData: (payload: { filename: string; content: string; mimeType?: string }) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
}

declare global {
  interface Window {
    voiceguardDesktop?: VoiceGuardDesktopApi;
  }
}

