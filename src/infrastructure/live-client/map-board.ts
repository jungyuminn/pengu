import type { LiveGame } from "../../application/ports";
import { liveChampionKey } from "../../domain/champion";
import type { LiveBoard, LiveBoardPlayer } from "../../domain/live-board";

export interface LivePayload {
  activePlayer?: {
    level?: number;
    riotId?: string;
    summonerName?: string;
    championName?: string;
    currentGold?: number;
  };
  allPlayers?: Array<{
    riotId?: string;
    riotIdGameName?: string;
    riotIdTagLine?: string;
    isDead?: boolean;
    level?: number;
    team?: string;
    summonerName?: string;
    championName?: string;
    rawChampionName?: string;
    scores?: { kills?: number; deaths?: number; assists?: number; creepScore?: number };
    items?: Array<{ itemID?: number; itemId?: number; slot?: number }>;
  }>;
  gameData?: { gameTime?: number; gameMode?: string };
  events?: { Events?: Array<{ EventName?: string }> };
}

export function liveGameFromPayload(payload: LivePayload): LiveGame | null {
  const board = liveBoardFromPayload(payload);
  if (!board) return null;
  const mine = board.players.find((row) => row.riotId === board.selfRiotId) ?? board.players[0];
  return {
    gameTime: board.gameTime,
    level: Number(payload.activePlayer?.level ?? mine?.level) || 0,
    isDead: Boolean(mine?.isDead),
    championName: mine?.championName || payload.activePlayer?.championName || null,
    started: matchStarted(payload),
    itemIds: (mine?.items ?? []).map((item) => item.id).filter((id) => id > 0),
  };
}

function matchStarted(payload: LivePayload): boolean {
  const events = payload.events?.Events ?? [];
  if (events.some((row) => row.EventName === "GameStart")) return true;
  return (Number(payload.gameData?.gameTime) || 0) >= 1;
}

export function liveBoardFromPayload(payload: LivePayload): LiveBoard | null {
  if (!payload.gameData || !payload.allPlayers?.length) return null;
  const me = payload.activePlayer;
  return {
    gameTime: Number(payload.gameData.gameTime) || 0,
    gameMode: String(payload.gameData.gameMode ?? ""),
    selfRiotId: me?.riotId?.trim() || null,
    selfSummonerName: me?.summonerName?.trim() || null,
    selfGold: Number.isFinite(me?.currentGold) ? Number(me?.currentGold) : null,
    players: payload.allPlayers.map(toPlayer),
  };
}

function toPlayer(row: NonNullable<LivePayload["allPlayers"]>[number]): LiveBoardPlayer {
  const champion = liveChampionKey(row.rawChampionName || row.championName || "");
  return {
    riotId: row.riotId ?? "",
    gameName: row.riotIdGameName || splitRiotId(row.riotId).gameName,
    tagLine: row.riotIdTagLine || splitRiotId(row.riotId).tagLine,
    summonerName: row.summonerName ?? "",
    championName: champion || row.championName || "",
    team: row.team || "",
    isDead: Boolean(row.isDead),
    level: Number(row.level) || 0,
    kills: Number(row.scores?.kills) || 0,
    deaths: Number(row.scores?.deaths) || 0,
    assists: Number(row.scores?.assists) || 0,
    cs: Number(row.scores?.creepScore) || 0,
    items: (row.items ?? [])
      .map((item) => ({
        id: Number(item.itemID ?? item.itemId) || 0,
        slot: Number(item.slot) || 0,
      }))
      .filter((item) => item.id > 0),
  };
}

function splitRiotId(value: string | undefined): { gameName: string; tagLine: string } {
  const riotId = value ?? "";
  const at = riotId.lastIndexOf("#");
  if (at < 0) return { gameName: riotId, tagLine: "" };
  return { gameName: riotId.slice(0, at), tagLine: riotId.slice(at + 1) };
}
