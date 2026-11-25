import { championIdFrom, type ChampionStat } from "../domain/champion";
import type { LeagueSession, LiveGame } from "./ports";

const ACTIVE = new Set(["ChampSelect", "GameStart", "InProgress"]);

export function playingChampionId(
  session: LeagueSession | null,
  live: Pick<LiveGame, "championName"> | null,
  champions: ChampionStat[],
): number | null {
  if (!ACTIVE.has(session?.phase ?? "") && !live) return null;
  return championIdFrom(champions, session?.championId ?? null, live?.championName);
}
