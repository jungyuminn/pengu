import https from "https";
import type { LeagueReader, LeagueSession } from "../../application/ports";
import { readLockfile, type Lockfile } from "./lockfile";

interface ChampSelectSession {
  localPlayerCellId?: number;
  myTeam?: Array<{ cellId?: number; championId?: number }>;
}

export class LcuLeagueReader implements LeagueReader {
  private cached: { at: number; session: LeagueSession | null } | null = null;

  async readSession(): Promise<LeagueSession | null> {
    if (this.cached && Date.now() - this.cached.at < 1500) return this.cached.session;

    const lockfile = await readLockfile();
    const session = lockfile
      ? await readLiveSession(lockfile)
      : null;
    this.cached = { at: Date.now(), session };
    return session;
  }
}

async function readLiveSession(lockfile: Lockfile): Promise<LeagueSession> {
  const [phase, championId] = await Promise.all([readPhase(lockfile), readChampionId(lockfile)]);
  return { phase, championId, championName: null };
}

async function readPhase(lockfile: Lockfile): Promise<string> {
  const phase = await getJson<string>(lockfile, "/lol-gameflow/v1/gameflow-phase").catch(() => "None");
  return typeof phase === "string" ? phase : "None";
}

async function readChampionId(lockfile: Lockfile): Promise<number | null> {
  const current = await getJson<number>(lockfile, "/lol-champ-select/v1/current-champion").catch(
    () => 0,
  );
  if (typeof current === "number" && current > 0) return current;

  const session = await getJson<ChampSelectSession>(
    lockfile,
    "/lol-champ-select/v1/session",
  ).catch(() => null);
  const me = session?.myTeam?.find((player) => player.cellId === session.localPlayerCellId);
  return me?.championId && me.championId > 0 ? me.championId : null;
}

function getJson<T>(lockfile: Lockfile, pathname: string): Promise<T> {
  const token = Buffer.from(`riot:${lockfile.password}`).toString("base64");
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "127.0.0.1",
        port: lockfile.port,
        path: pathname,
        method: "GET",
        rejectUnauthorized: false,
        headers: { Authorization: `Basic ${token}` },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(chunk as Buffer));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (!response.statusCode || response.statusCode >= 400) {
            reject(new Error(`LCU ${response.statusCode}`));
            return;
          }
          resolve(JSON.parse(body) as T);
        });
      },
    );
    request.on("error", reject);
    request.end();
  });
}
