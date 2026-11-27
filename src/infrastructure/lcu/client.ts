import type { LeagueReader, LeagueSession } from "../../application/ports";
import {
  championIdFromGameflow,
  type CurrentSummoner,
  type GameflowSession,
} from "./game-champion";
import { champSelectChampionId, type ChampSelectSession } from "./champ-select";
import { readLockfile, type Lockfile } from "./lockfile";
import { lcuRequest } from "./request";

const IN_GAME = new Set(["GameStart", "InProgress", "Reconnect"]);

export class LcuLeagueReader implements LeagueReader {
  private cached: { at: number; session: LeagueSession | null } | null = null;
  private lastChampionId: number | null = null;

  async readSession(): Promise<LeagueSession | null> {
    const ttl = this.cached?.session?.phase === "ChampSelect" ? 250 : 1500;
    if (this.cached && Date.now() - this.cached.at < ttl) return this.cached.session;

    const lockfile = await readLockfile();
    const session = lockfile ? await this.readLiveSession(lockfile) : null;
    this.cached = { at: Date.now(), session };
    return session;
  }

  private async readLiveSession(lockfile: Lockfile): Promise<LeagueSession> {
    const phase = await readPhase(lockfile);
    if (phase === "ChampSelect") {
      const championId = await readChampSelectId(lockfile);
      if (championId) this.lastChampionId = championId;
      return { phase, championId, championName: null };
    }
    if (IN_GAME.has(phase)) {
      if (!this.lastChampionId) {
        this.lastChampionId = await readGameChampionId(lockfile);
      }
      return {
        phase: phase === "Reconnect" ? "InProgress" : phase,
        championId: this.lastChampionId,
        championName: null,
      };
    }
    if (phase === "None" || phase === "Lobby" || phase === "Matchmaking" || phase === "ReadyCheck") {
      this.lastChampionId = null;
    }
    return { phase, championId: this.lastChampionId, championName: null };
  }
}

async function readPhase(lockfile: Lockfile): Promise<string> {
  const phase = await lcuRequest<string>(lockfile, "/lol-gameflow/v1/gameflow-phase").catch(() => "None");
  return typeof phase === "string" ? phase : "None";
}

async function readChampSelectId(lockfile: Lockfile): Promise<number | null> {
  const [current, session] = await Promise.all([
    lcuRequest<number>(lockfile, "/lol-champ-select/v1/current-champion").catch(() => 0),
    lcuRequest<ChampSelectSession>(lockfile, "/lol-champ-select/v1/session").catch(() => null),
  ]);
  return champSelectChampionId(typeof current === "number" ? current : 0, session);
}

async function readGameChampionId(lockfile: Lockfile): Promise<number | null> {
  const [flow, me] = await Promise.all([
    lcuRequest<GameflowSession>(lockfile, "/lol-gameflow/v1/session").catch(() => null),
    lcuRequest<CurrentSummoner>(lockfile, "/lol-summoner/v1/current-summoner").catch(() => null),
  ]);
  return championIdFromGameflow(flow, me);
}
