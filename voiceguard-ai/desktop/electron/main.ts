import { app, BrowserWindow } from 'electron';
import { createMainWindow } from './window/windowManager';
import { setupSecurityHeaders } from './security/csp';
import { registerIpcHandlers } from './ipc/handlers';

// Hardware acceleration and process security flags
app.enableSandbox();

app.whenReady().then(() => {
  setupSecurityHeaders();
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

