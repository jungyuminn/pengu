import { Menu, Tray, app, type BrowserWindow } from "electron";
import { appIcon } from "./app-icon";
import { fadeHideWindow, fadeShowWindow } from "./window-fade";

let quitting = false;
let tray: Tray | undefined;

export function showSettingsWindow(window: BrowserWindow): void {
  void fadeShowWindow(window, trayBounds());
}

export function bindSettingsHideOnClose(window: BrowserWindow): void {
  window.on("close", (event) => {
    if (quitting) return;
    event.preventDefault();
    void fadeHideWindow(window, trayBounds());
  });
}

export function createAppTray(window: BrowserWindow): void {
  tray?.destroy();
  tray = new Tray(appIcon());
  tray.setToolTip("Pengu");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "열기", click: () => showSettingsWindow(window) },
      { type: "separator" },
      { label: "종료", click: () => quitApp() },
    ]),
  );
  tray.on("click", () => showSettingsWindow(window));
}

export function quitApp(): void {
  quitting = true;
  destroyAppTray();
  app.quit();
}

export function destroyAppTray(): void {
  tray?.destroy();
  tray = undefined;
}

function trayBounds(): { x: number; y: number; width: number; height: number } | null {
  try {
    return tray?.getBounds() ?? null;
  } catch {
    return null;
  }
}

export function watchAppQuit(): void {
  app.on("before-quit", () => {
    quitting = true;
  });
  app.on("window-all-closed", () => {
    if (quitting) app.quit();
  });
}
