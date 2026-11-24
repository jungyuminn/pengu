import { existsSync } from "fs";
import { BrowserWindow, nativeImage, screen, shell } from "electron";
import path from "path";
import { windowBackground, type ThemeMode } from "../../domain/theme";

function appIcon() {
  const ico = path.join(__dirname, "../../assets/icons/pengu.ico");
  const png = path.join(__dirname, "../../assets/icons/pengu_icon.png");
  const file = existsSync(ico) ? ico : png;
  return nativeImage.createFromPath(file);
}

export function createSettingsWindow(theme: ThemeMode = "dark"): BrowserWindow {
  const { width: workWidth, height: workHeight } = screen.getPrimaryDisplay().workAreaSize;
  const window = new BrowserWindow({
    width: Math.min(1440, workWidth),
    height: Math.min(900, workHeight),
    minWidth: 960,
    minHeight: 680,
    title: "Pengu",
    icon: appIcon(),
    frame: false,
    thickFrame: true,
    autoHideMenuBar: true,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: windowBackground(theme),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/settings.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  window.once("ready-to-show", () => {
    window.setIcon(appIcon());
    window.show();
  });
  void window.loadFile(path.join(__dirname, "../renderer/settings/index.html"));
  return window;
}

export function createOverlayWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const window = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    alwaysOnTop: true,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/overlay.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  window.setIgnoreMouseEvents(true, { forward: true });
  window.setAlwaysOnTop(true, "screen-saver");
  void window.loadFile(path.join(__dirname, "../renderer/overlay/index.html"));
  return window;
}
