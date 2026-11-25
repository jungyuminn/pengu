import { access, readFile, writeFile } from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { parseWindowMode } from "../../domain/league-window-mode";

const execFileAsync = promisify(execFile);

const KNOWN_CFG = [
  "C:\\Riot Games\\League of Legends\\Config\\game.cfg",
  "D:\\Riot Games\\League of Legends\\Config\\game.cfg",
];

export class GameCfgWindowMode {
  private cachedPath: string | null | undefined;

  async read(): Promise<number | null> {
    const file = await this.cfgPath();
    if (!file) return null;
    try {
      return parseWindowMode(await readFile(file, "utf8"));
    } catch {
      return null;
    }
  }

  async write(mode: number): Promise<boolean> {
    const file = await this.cfgPath();
    if (!file) return false;
    const current = await readFile(file, "utf8");
    if (parseWindowMode(current) === mode) return true;
    const next = current.replace(/^(WindowMode\s*=\s*)-?\d+(\s*)$/m, `$1${mode}$2`);
    if (next === current) return false;
    await writeFile(file, next, "utf8");
    return true;
  }

  private async cfgPath(): Promise<string | null> {
    if (this.cachedPath !== undefined) return this.cachedPath;
    const found = await findGameCfg();
    this.cachedPath = found;
    return found;
  }
}

async function findGameCfg(): Promise<string | null> {
  for (const candidate of KNOWN_CFG) {
    if (await exists(candidate)) return candidate;
  }
  const fromInstall = await installDirectory();
  if (fromInstall) {
    const nested = path.join(fromInstall, "Config", "game.cfg");
    if (await exists(nested)) return nested;
  }
  return null;
}

async function installDirectory(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "(Get-CimInstance Win32_Process -Filter \"name='LeagueClientUx.exe'\").CommandLine",
      ],
      { windowsHide: true },
    );
    const raw = stdout.match(/--install-directory=("(?:[^"]+)"|[^\s"]+)/i)?.[1];
    if (!raw) return null;
    return raw.replace(/^"|"$/g, "").replace(/\//g, "\\");
  } catch {
    return null;
  }
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
