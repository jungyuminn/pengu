import { BrowserWindow } from "electron";
import { originInBounds, type SlideRect } from "./window-slide";

const SHOW_MS = 380;
const HIDE_MS = 260;

const tokens = new WeakMap<BrowserWindow, number>();

function begin(window: BrowserWindow): number {
  const token = (tokens.get(window) ?? 0) + 1;
  tokens.set(window, token);
  return token;
}

function alive(window: BrowserWindow, token: number): boolean {
  return !window.isDestroyed() && tokens.get(window) === token;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

async function fadeWindowOpacity(
  window: BrowserWindow,
  to: number,
  ms: number,
  token: number,
): Promise<void> {
  if (!alive(window, token)) return;
  const from = window.getOpacity();
  const steps = Math.max(1, Math.round(ms / 16));
  for (let step = 1; step <= steps; step += 1) {
    if (!alive(window, token)) return;
    window.setOpacity(from + (to - from) * easeOut(step / steps));
    await delay(16);
  }
  if (alive(window, token)) window.setOpacity(to);
}

async function playTrayMotion(
  window: BrowserWindow,
  phase: "pre" | "in" | "out" | "idle",
  origin: { x: number; y: number },
): Promise<void> {
  if (window.webContents.isDestroyed()) return;
  const x = origin.x.toFixed(1);
  const y = origin.y.toFixed(1);
  await window.webContents.executeJavaScript(
    `document.documentElement.style.setProperty("--tray-x","${x}%");
     document.documentElement.style.setProperty("--tray-y","${y}%");
     document.documentElement.dataset.tray="${phase}";`,
    true,
  );
}

function trayOrigin(window: BrowserWindow, origin: SlideRect | null): { x: number; y: number } {
  return originInBounds(window.getBounds(), origin);
}

export async function fadeInWindow(window: BrowserWindow, ms = 320): Promise<void> {
  if (window.isDestroyed()) return;
  await fadeWindowOpacity(window, 1, ms, begin(window));
}

export async function fadeOutWindow(window: BrowserWindow, ms = 200): Promise<void> {
  if (window.isDestroyed()) return;
  await fadeWindowOpacity(window, 0, ms, begin(window));
}

export async function fadeShowWindow(window: BrowserWindow, origin: SlideRect | null = null): Promise<void> {
  if (window.isDestroyed()) return;
  window.setSkipTaskbar(false);
  if (window.isMinimized()) {
    begin(window);
    window.restore();
    window.setOpacity(1);
    window.show();
    window.focus();
    return;
  }
  if (window.isVisible() && window.getOpacity() >= 0.98) {
    begin(window);
    window.show();
    window.focus();
    return;
  }
  const token = begin(window);
  const from = trayOrigin(window, origin);
  const painted = window.getBackgroundColor();
  window.setBackgroundColor("#00000000");
  try {
    await playTrayMotion(window, "pre", from);
  } catch {
    window.setOpacity(0);
  }
  if (!alive(window, token)) return;
  window.setOpacity(1);
  window.show();
  window.focus();
  await delay(16);
  if (!alive(window, token)) return;
  try {
    await playTrayMotion(window, "in", from);
    await delay(SHOW_MS);
  } catch {
    await fadeWindowOpacity(window, 1, SHOW_MS, token);
  }
  if (!alive(window, token) || window.isDestroyed()) return;
  await playTrayMotion(window, "idle", from).catch(() => undefined);
  window.setBackgroundColor(painted || "#10141c");
}

export async function fadeHideWindow(window: BrowserWindow, origin: SlideRect | null = null): Promise<void> {
  if (window.isDestroyed() || !window.isVisible()) return;
  const token = begin(window);
  const from = trayOrigin(window, origin);
  const painted = window.getBackgroundColor();
  window.setBackgroundColor("#00000000");
  try {
    await playTrayMotion(window, "out", from);
    await delay(HIDE_MS);
  } catch {
    await fadeWindowOpacity(window, 0, HIDE_MS, token);
  }
  if (!alive(window, token) || window.isDestroyed()) return;
  window.hide();
  window.setSkipTaskbar(true);
  window.setOpacity(1);
  await playTrayMotion(window, "idle", from).catch(() => undefined);
  if (!window.isDestroyed()) window.setBackgroundColor(painted || "#10141c");
}
