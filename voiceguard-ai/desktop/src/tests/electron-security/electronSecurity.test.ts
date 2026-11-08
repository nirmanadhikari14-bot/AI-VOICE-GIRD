/**
 * Electron Security Configuration Tests
 * Verifies mandatory security baselines are correctly declared.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ELECTRON_MAIN_PATH = join(__dirname, '../../../electron/main.ts');
const WINDOW_MANAGER_PATH = join(__dirname, '../../../electron/window/windowManager.ts');
const PRELOAD_PATH = join(__dirname, '../../../electron/preload.ts');
const CSP_PATH = join(__dirname, '../../../electron/security/csp.ts');
const IPC_HANDLERS_PATH = join(__dirname, '../../../electron/ipc/handlers.ts');

const readSource = (filePath: string): string => {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    throw new Error(`Cannot read required Electron source file: ${filePath}`);
  }
};

describe('Electron Security: Process Isolation & Node Integration', () => {
  const windowManagerSrc = readSource(WINDOW_MANAGER_PATH);

  it('enables contextIsolation', () => {
    expect(windowManagerSrc).toMatch(/contextIsolation\s*:\s*true/);
  });

  it('disables nodeIntegration', () => {
    expect(windowManagerSrc).toMatch(/nodeIntegration\s*:\s*false/);
  });

  it('enables sandbox mode', () => {
    expect(windowManagerSrc).toMatch(/sandbox\s*:\s*true/);
  });

  it('blocks external navigation via will-navigate handler', () => {
    expect(windowManagerSrc).toMatch(/will-navigate/);
  });
});

describe('Electron Security: Preload Bridge API Restrictions', () => {
  const preloadSrc = readSource(PRELOAD_PATH);

  it('uses contextBridge.exposeInMainWorld', () => {
    expect(preloadSrc).toMatch(/contextBridge\.exposeInMainWorld/);
  });

  it('exposes only the named voiceguardDesktop object', () => {
    expect(preloadSrc).toMatch(/['"]voiceguardDesktop['"]/);
  });

  it('does not expose raw ipcRenderer directly on window', () => {
    const directExposure = /window\s*\.\s*ipcRenderer/;
    expect(preloadSrc).not.toMatch(directExposure);
  });
});

describe('Electron Security: IPC Channel Allowlist', () => {
  const ipcHandlersSrc = readSource(IPC_HANDLERS_PATH);

  const REQUIRED_CHANNELS = [
    'desktop:getVersion',
    'desktop:showNotification',
    'desktop:minimize',
    'desktop:maximize',
    'desktop:close',
    'desktop:exportData',
  ];

  REQUIRED_CHANNELS.forEach((channel) => {
    it(`registers the IPC channel: ${channel}`, () => {
      expect(ipcHandlersSrc).toContain(channel);
    });
  });

  it('does not expose arbitrary shell execution channels', () => {
    expect(ipcHandlersSrc).not.toMatch(/exec|spawn|child_process/);
  });
});

describe('Electron Security: Content Security Policy', () => {
  const cspSrc = readSource(CSP_PATH);

  it('restricts script sources', () => {
    expect(cspSrc).toMatch(/script-src/);
  });

  it('applies CSP headers to all sessions', () => {
    expect(cspSrc).toMatch(/onHeadersReceived|Content-Security-Policy/);
  });
});

describe('Electron Security: Main Process Entry', () => {
  // main.ts delegates BrowserWindow creation (including preload) to windowManager
  const mainSrc = readSource(ELECTRON_MAIN_PATH);
  const windowManagerSrc = readSource(WINDOW_MANAGER_PATH);

  it('delegates window creation to windowManager which loads the preload script', () => {
    expect(mainSrc).toMatch(/windowManager|createMainWindow/);
    expect(windowManagerSrc).toMatch(/preload/);
  });

  it('does not declare nodeIntegration: true anywhere in main process', () => {
    expect(mainSrc).not.toMatch(/nodeIntegration\s*:\s*true/);
    expect(windowManagerSrc).not.toMatch(/nodeIntegration\s*:\s*true/);
  });

  it('enables app.enableSandbox() for renderer process sandboxing', () => {
    expect(mainSrc).toMatch(/enableSandbox/);
  });
});
