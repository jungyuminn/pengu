import { BrowserWindow } from "electron";
import path from "path";
import { appIcon } from "./app-icon";

const MIN_MS = 1400;

export function createSplashWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 640,
    height: 360,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    movable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    center: true,
    show: false,
    backgroundColor: "#00000000",
    icon: appIcon(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  window.once("ready-to-show", () => {
    if (window.isDestroyed()) return;
    window.setIcon(appIcon());
    window.show();
  });
  void window.loadFile(path.join(__dirname, "../renderer/splash/index.html"));
  return window;
}

export function waitUntilReady(window: BrowserWindow): Promise<void> {
  return new Promise((resolve) => {
    if (window.isDestroyed()) {
      resolve();
      return;
    }
    const done = () => resolve();
    window.once("ready-to-show", done);
    if (!window.webContents.isLoadingMainFrame() && window.webContents.getURL()) {
      window.removeListener("ready-to-show", done);
      done();
    }
  });
}

export async function revealMainWindow(
  splash: BrowserWindow,
  main: BrowserWindow,
  startedAt: number,
): Promise<void> {
  const wait = Math.max(0, MIN_MS - (Date.now() - startedAt));
  if (wait) await delay(wait);
  if (!main.isDestroyed()) {
    main.setIcon(appIcon());
    main.show();
    main.focus();
  }
  if (splash.isDestroyed()) return;
  await fadeOut(splash);
  if (!splash.isDestroyed()) splash.close();
}

async function fadeOut(window: BrowserWindow): Promise<void> {
  for (let step = 10; step >= 0; step -= 1) {
    if (window.isDestroyed()) return;
    window.setOpacity(step / 10);
    await delay(16);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
