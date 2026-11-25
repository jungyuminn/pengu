import { readLockfile } from "./lockfile";
import { lcuRequest } from "./request";

const PATH = "/lol-game-settings/v1/game-settings";

interface GameSettings {
  General?: { WindowMode?: number | string };
}

export class LcuWindowModeSettings {
  async read(): Promise<number | null> {
    const settings = await loadSettings();
    return modeOf(settings);
  }

  async write(mode: number): Promise<boolean> {
    const lockfile = await readLockfile();
    if (!lockfile) return false;
    const current = await lcuRequest<GameSettings>(lockfile, PATH).catch(() => null);
    if (!current?.General) {
      await lcuRequest(lockfile, PATH, { method: "PATCH", body: { General: { WindowMode: mode } } });
      return true;
    }
    const value = current.General.WindowMode;
    current.General.WindowMode = typeof value === "string" ? String(mode) : mode;
    await lcuRequest(lockfile, PATH, { method: "PATCH", body: current });
    return true;
  }
}

async function loadSettings(): Promise<GameSettings | null> {
  const lockfile = await readLockfile();
  if (!lockfile) return null;
  return lcuRequest<GameSettings>(lockfile, PATH).catch(() => null);
}

function modeOf(settings: GameSettings | null): number | null {
  const raw = settings?.General?.WindowMode;
  const value = Number(raw);
  return Number.isInteger(value) ? value : null;
}
