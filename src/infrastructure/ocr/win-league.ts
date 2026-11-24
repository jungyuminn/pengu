import koffi from "koffi";
import {
  ClientToScreen,
  FindWindowW,
  GA_ROOT,
  GetAncestor,
  GetClientRect,
  GetForegroundWindow,
} from "./win32";

export interface LeagueBox {
  hwnd: unknown;
  x: number;
  y: number;
  width: number;
  height: number;
}

const TITLES = ["League of Legends (TM) Client", "League of Legends"];
const CACHE_MS = 1500;

let cached: { at: number; box: LeagueBox | null } | null = null;

export function leagueClientBox(): LeagueBox | null {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.box;
  const box = queryLeagueBox();
  cached = { at: Date.now(), box };
  return box;
}

export function leagueClientFocused(): boolean {
  const box = leagueClientBox();
  if (!box) return false;
  try {
    const foreground = GetForegroundWindow();
    if (!foreground) return false;
    return windowId(rootWindow(foreground)) === windowId(rootWindow(box.hwnd));
  } catch {
    return true;
  }
}

function queryLeagueBox(): LeagueBox | null {
  if (process.platform !== "win32") return null;
  try {
    for (const title of TITLES) {
      const hwnd = FindWindowW(null, title);
      const box = clientBox(hwnd);
      if (box) return box;
    }
  } catch {
    return null;
  }
  return null;
}

function rootWindow(hwnd: unknown): unknown {
  try {
    return GetAncestor(hwnd, GA_ROOT) || hwnd;
  } catch {
    return hwnd;
  }
}

function windowId(hwnd: unknown): string {
  try {
    return String(koffi.address(hwnd));
  } catch {
    return String(hwnd);
  }
}

function clientBox(hwnd: unknown): LeagueBox | null {
  if (!hwnd) return null;
  const rect = { left: 0, top: 0, right: 0, bottom: 0 };
  if (!GetClientRect(hwnd, rect)) return null;
  const width = rect.right - rect.left;
  const height = rect.bottom - rect.top;
  if (width < 200 || height < 200) return null;
  const point = { x: 0, y: 0 };
  if (!ClientToScreen(hwnd, point)) return null;
  return { hwnd, x: point.x, y: point.y, width, height };
}
