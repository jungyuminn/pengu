import { BrowserWindow } from "electron";

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

export async function fadeInWindow(window: BrowserWindow, ms = 320): Promise<void> {
  if (window.isDestroyed()) return;
  await fadeWindowOpacity(window, 1, ms, begin(window));
}

export async function fadeOutWindow(window: BrowserWindow, ms = 200): Promise<void> {
  if (window.isDestroyed()) return;
  await fadeWindowOpacity(window, 0, ms, begin(window));
}

export async function fadeShowWindow(window: BrowserWindow): Promise<void> {
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
  if (!window.isVisible()) window.setOpacity(0);
  window.show();
  window.focus();
  await fadeWindowOpacity(window, 1, 280, token);
}

export async function fadeHideWindow(window: BrowserWindow): Promise<void> {
  if (window.isDestroyed() || !window.isVisible()) return;
  const token = begin(window);
  await fadeWindowOpacity(window, 0, 180, token);
  if (!alive(window, token)) return;
  window.hide();
  window.setSkipTaskbar(true);
  window.setOpacity(1);
}
