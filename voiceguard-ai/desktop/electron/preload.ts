import { contextBridge, ipcRenderer } from 'electron';

export interface VoiceGuardDesktopApi {
  platform: string;
  getVersion: () => Promise<string>;
  showNotification: (payload: { title: string; body: string; urgency?: 'normal' | 'critical' | 'low' }) => Promise<boolean>;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  exportData: (payload: { filename: string; content: string; mimeType?: string }) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
}

const desktopApi: VoiceGuardDesktopApi = {
  platform: process.platform,
  getVersion: () => ipcRenderer.invoke('desktop:getVersion'),
  showNotification: (payload) => ipcRenderer.invoke('desktop:showNotification', payload),
  minimize: () => ipcRenderer.send('desktop:minimize'),
  maximize: () => ipcRenderer.send('desktop:maximize'),
  close: () => ipcRenderer.send('desktop:close'),
  exportData: (payload) => ipcRenderer.invoke('desktop:exportData', payload),
};

contextBridge.exposeInMainWorld('voiceguardDesktop', desktopApi);

