import type { LeagueReader, LeagueSession } from "../../application/ports";
import {
  championIdFromGameflow,
  type CurrentSummoner,
  type GameflowSession,
} from "./game-champion";
import { readLockfile, type Lockfile } from "./lockfile";
import { lcuRequest } from "./request";

const IN_GAME = new Set(["GameStart", "InProgress", "Reconnect"]);

interface ChampSelectSession {
  localPlayerCellId?: number;
  myTeam?: Array<{ cellId?: number; championId?: number }>;
}

export class LcuLeagueReader implements LeagueReader {
  private cached: { at: number; session: LeagueSession | null } | null = null;
  private lastChampionId: number | null = null;

  async readSession(): Promise<LeagueSession | null> {
    if (this.cached && Date.now() - this.cached.at < 1500) return this.cached.session;

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
  const current = await lcuRequest<number>(lockfile, "/lol-champ-select/v1/current-champion").catch(() => 0);
  if (typeof current === "number" && current > 0) return current;

  const session = await lcuRequest<ChampSelectSession>(lockfile, "/lol-champ-select/v1/session").catch(() => null);
  const me = session?.myTeam?.find((player) => player.cellId === session.localPlayerCellId);
  return me?.championId && me.championId > 0 ? me.championId : null;
}

async function readGameChampionId(lockfile: Lockfile): Promise<number | null> {
  const [flow, me] = await Promise.all([
    lcuRequest<GameflowSession>(lockfile, "/lol-gameflow/v1/session").catch(() => null),
    lcuRequest<CurrentSummoner>(lockfile, "/lol-summoner/v1/current-summoner").catch(() => null),
  ]);
  return championIdFromGameflow(flow, me);
}
