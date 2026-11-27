import { MAYHEM_QUEUE_ID } from "./mayhem";

export class InvalidSample extends Error {}

export interface SamplePlayer {
  participantId: number;
  teamId: number;
  championId: number;
  win: boolean;
  augments: (number | null)[];
}

export interface MatchSample {
  platform: string;
  gameId: number;
  version: string;
  queueId: number;
  mode: string;
  players: SamplePlayer[];
}

export function positiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function samplePatch(game: MatchSample, expectedId: number): string {
  if (!positiveId(game.gameId) || game.gameId !== expectedId) throw new InvalidSample("game-id");
  if (game.platform !== "KR" || game.queueId !== MAYHEM_QUEUE_ID || game.mode !== "KIWI") {
    throw new InvalidSample("region-or-mode");
  }
  const patch = typeof game.version === "string" && /^(\d+\.\d+)(?:\.\d+)*$/.exec(game.version);
  if (!patch) throw new InvalidSample("game-version");
  if (game.players.length !== 10) throw new InvalidSample("player-count");
  const seen = new Set<number>();
  const teams = new Map<number, { wins: boolean; size: number }>();
  for (const p of game.players) {
    if (!positiveId(p.participantId) || seen.has(p.participantId) || !positiveId(p.championId)) {
      throw new InvalidSample("participant");
    }
    seen.add(p.participantId);
    if (![100, 200].includes(p.teamId) || typeof p.win !== "boolean") throw new InvalidSample("outcome");
    const team = teams.get(p.teamId) ?? { wins: p.win, size: 0 };
    if (team.wins !== p.win) throw new InvalidSample("outcome");
    team.size++;
    teams.set(p.teamId, team);
    if (p.augments.length !== 6 || p.augments.some(id => id !== null && !positiveId(id))) {
      throw new InvalidSample("augment-slot");
    }
  }
  if (teams.get(100)?.size !== 5 || teams.get(200)?.size !== 5 || teams.get(100)?.wins === teams.get(200)?.wins) {
    throw new InvalidSample("teams");
  }
  return patch[1];
}
