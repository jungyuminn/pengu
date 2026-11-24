import type { Grade } from "./grade";

export interface ChampionStat {
  id: number;
  key: string;
  names: { ko: string; en: string };
  title: string;
  iconUrl: string | null;
  grade: Grade;
  pickRate: number | null;
  winRate: number | null;
}

export interface OverlayChampion {
  name: string;
  grade: Grade;
}

export function findChampionById(
  champions: ChampionStat[],
  championId: number | null | undefined,
): ChampionStat | null {
  if (!championId) return null;
  return champions.find((item) => item.id === championId) ?? null;
}

export function overlayChampionFor(
  champions: ChampionStat[],
  championId: number | null | undefined,
): OverlayChampion | null {
  const hit = findChampionById(champions, championId);
  if (!hit) return null;
  return {
    name: hit.names.ko || hit.names.en,
    grade: hit.grade,
  };
}
