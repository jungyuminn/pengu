export const MAYHEM_QUEUE_ID = 2400;
export const MAYHEM_MATCH_CAP = 100;

export interface MayhemPlayer {
  puuid: string;
  gameName: string;
  tagLine: string;
  teamId: number;
  championId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  level: number;
  gold: number;
  damage: number;
  cs: number;
  spellIds: number[];
  itemIds: number[];
  augmentIds: number[];
}

export interface MayhemMatch {
  gameId: number;
  playedAt: number;
  durationSec: number;
  championId: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  augmentIds: number[];
  players: MayhemPlayer[];
}

export interface MayhemProfile {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId?: number | null;
  matches: MayhemMatch[];
}

export function isMayhemQueue(queueId: number | null | undefined, gameMode?: string | null): boolean {
  if (queueId === MAYHEM_QUEUE_ID) return true;
  return String(gameMode ?? "").toUpperCase() === "KIWI";
}

export function hasMayhemBoard(match: MayhemMatch | null | undefined): boolean {
  return (match?.players?.length ?? 0) >= 2;
}

export function richerMayhemMatch(left: MayhemMatch, right: MayhemMatch): MayhemMatch {
  const augmentIds = right.augmentIds.length >= left.augmentIds.length ? right.augmentIds : left.augmentIds;
  const leftPlayers = left.players ?? [];
  const rightPlayers = right.players ?? [];
  const players = rightPlayers.length >= leftPlayers.length ? rightPlayers : leftPlayers;
  return {
    gameId: right.gameId,
    playedAt: right.playedAt || left.playedAt,
    durationSec: right.durationSec || left.durationSec || 0,
    championId: right.championId || left.championId,
    win: right.win,
    kills: right.kills,
    deaths: right.deaths,
    assists: right.assists,
    augmentIds,
    players,
  };
}
