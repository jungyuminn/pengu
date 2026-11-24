import { readFile } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const PROCESS_TTL_MS = 5000;

export interface Lockfile {
  port: number;
  password: string;
}

let processCache: { at: number; value: Lockfile | null } | null = null;

export async function readLockfile(): Promise<Lockfile | null> {
  const fallbacks = [
    "C:\\Riot Games\\League of Legends\\lockfile",
    "D:\\Riot Games\\League of Legends\\lockfile",
  ];
  for (const candidate of fallbacks) {
    const parsed = await parseLockfile(candidate);
    if (parsed) return parsed;
  }
  return readFromProcess();
}

async function readFromProcess(): Promise<Lockfile | null> {
  if (processCache && Date.now() - processCache.at < PROCESS_TTL_MS) {
    return processCache.value;
  }

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
    const port = stdout.match(/--app-port=(\d+)/)?.[1];
    const password = stdout.match(/--remoting-auth-token=([^\s"]+)/)?.[1];
    const value = port && password ? { port: Number(port), password } : null;
    processCache = { at: Date.now(), value };
    return value;
  } catch {
    processCache = { at: Date.now(), value: null };
    return null;
  }
}

async function parseLockfile(filePath: string): Promise<Lockfile | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parts = raw.trim().split(":");
    if (parts.length < 5) return null;
    return { port: Number(parts[2]), password: parts[3] ?? "" };
  } catch {
    return null;
  }
}
