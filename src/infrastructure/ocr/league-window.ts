import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const CACHE_MS = 2000;

export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

let cached: { at: number; rect: PixelRect | null } | null = null;

export function parseLeagueRect(text: string): PixelRect | null {
  const match = text.trim().match(/^(-?\d+),(-?\d+),(\d+),(\d+)$/m);
  if (!match) return null;
  const rect = {
    x: Number(match[1]),
    y: Number(match[2]),
    width: Number(match[3]),
    height: Number(match[4]),
  };
  if (rect.width < 200 || rect.height < 200) return null;
  return rect;
}

export async function leagueGameRect(): Promise<PixelRect | null> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.rect;
  const rect = await queryLeagueGameRect();
  cached = { at: Date.now(), rect };
  return rect;
}

async function queryLeagueGameRect(): Promise<PixelRect | null> {
  const scriptPath = path.join(__dirname, "../../scripts/league-window.ps1");
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath],
      { windowsHide: true, timeout: 2500 },
    );
    return parseLeagueRect(stdout);
  } catch {
    return null;
  }
}
