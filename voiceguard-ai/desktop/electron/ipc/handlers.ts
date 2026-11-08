import { ipcMain, BrowserWindow, app, dialog } from 'electron';
import fs from 'fs';
import { showDesktopNotification } from '../notifications/desktopNotifier';

export function registerIpcHandlers(): void {
  // App Version
  ipcMain.handle('desktop:getVersion', () => {
    return app.getVersion();
  });

  // Desktop Notifications
  ipcMain.handle('desktop:showNotification', (_event, payload) => {
    if (!payload || typeof payload !== 'object') {
      return false;
    }
    return showDesktopNotification(payload);
  });

  // Window Controls
  ipcMain.on('desktop:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.minimize();
  });

  ipcMain.on('desktop:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
  });

  ipcMain.on('desktop:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) win.close();
  });

  // Controlled Data Export to File
  ipcMain.handle('desktop:exportData', async (event, { filename, content, mimeType }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { success: false, error: 'No active window' };

    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      title: 'Export Security Report',
      defaultPath: filename || 'voiceguard-security-report.csv',
      filters: [
        { name: 'Reports', extensions: [filename?.endsWith('.json') ? 'json' : 'csv'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    try {
      await fs.promises.writeFile(filePath, content, 'utf8');
      return { success: true, filePath };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to write file' };
    }
  });
}

