import { BrowserWindow, screen, shell } from "electron";
import path from "path";
import {
  BUILD_OVERLAY,
  CARD_OVERLAY,
  GAME_OVERLAY,
  NOTICE_OVERLAY,
  scaleRect,
  type PercentRect,
} from "../../domain/layout";
import { windowBackground, type ThemeMode } from "../../domain/theme";
import { leagueGameRect } from "../../infrastructure/ocr/league-window";
import { appIcon } from "./app-icon";

const fitted = new WeakMap<BrowserWindow, string>();

export function createSettingsWindow(theme: ThemeMode = "dark"): BrowserWindow {
  const { width: workWidth, height: workHeight } = screen.getPrimaryDisplay().workAreaSize;
  const window = new BrowserWindow({
    width: Math.min(1440, workWidth),
    height: Math.min(900, workHeight),
    minWidth: 1100,
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
  });
  void window.loadFile(path.join(__dirname, "../renderer/settings/index.html"));
  return window;
}

export type OverlayFitKind = "game" | "notice" | "cards" | "build";

export async function fitOverlayToGame(
  window: BrowserWindow,
  kind: OverlayFitKind,
): Promise<void> {
  const league = await leagueGameRect();
  const region =
    kind === "cards" ? CARD_OVERLAY : kind === "build" ? BUILD_OVERLAY : kind === "notice" ? NOTICE_OVERLAY : GAME_OVERLAY;
  if (!league) {
    const display = screen.getPrimaryDisplay();
    applyOverlayBounds(window, kind, overlayBounds(display.bounds, region, 1));
    return;
  }
  const factor = screen.getPrimaryDisplay().scaleFactor || 1;
  const display = screen.getDisplayNearestPoint({
    x: Math.round(league.x / factor),
    y: Math.round(league.y / factor),
  });
  const scale = display.scaleFactor || 1;
  const game = {
    x: Math.round(league.x / scale),
    y: Math.round(league.y / scale),
    width: Math.round(league.width / scale),
    height: Math.round(league.height / scale),
  };
  applyOverlayBounds(window, kind, overlayBounds(game, region, 1));
}

function applyOverlayBounds(
  window: BrowserWindow,
  kind: OverlayFitKind,
  next: { x: number; y: number; width: number; height: number },
): void {
  const key = `${kind}:${next.x},${next.y},${next.width},${next.height}`;
  if (fitted.get(window) === key) return;
  fitted.set(window, key);
  window.setBounds(next);
}

function overlayBounds(
  game: { x: number; y: number; width: number; height: number },
  region: PercentRect,
  scale: number,
): { x: number; y: number; width: number; height: number } {
  const box = scaleRect(region, game.width, game.height);
  return {
    x: game.x + Math.round(box.x * scale),
    y: game.y + Math.round(box.y * scale),
    width: Math.max(80, box.width),
    height: Math.max(40, box.height),
  };
}

export function createOverlayWindow(): BrowserWindow {
  const { x, y, width, height } = screen.getPrimaryDisplay().bounds;
  const window = new BrowserWindow({
    width,
    height,
    x,
    y,
    title: "Pengu Overlay",
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    alwaysOnTop: true,
    fullscreenable: false,
    hasShadow: false,
    show: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "../preload/overlay.js"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });
  window.setIgnoreMouseEvents(true, { forward: true });
  window.setAlwaysOnTop(true, "screen-saver");
  window.setContentProtection(true);
  void window.loadFile(path.join(__dirname, "../renderer/overlay/index.html"));
  return window;
}
