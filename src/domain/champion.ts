import type { Grade } from "./grade";
import { normalizeName } from "./text";

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

export interface OverlayItem {
  id?: number | null;
  name: string;
  iconUrl: string | null;
  owned?: boolean;
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
  return toOverlayChampion(findChampionById(champions, championId));
}

export function liveChampionKey(value: string): string {
  return value.replace(/^game_character_displayname_/i, "");
}

export function findChampionByName(
  champions: ChampionStat[],
  name: string | null | undefined,
): ChampionStat | null {
  const needle = normalizeName(liveChampionKey(name ?? ""));
  if (!needle) return null;
  return (
    champions.find(
      (item) =>
        normalizeName(item.key) === needle ||
        normalizeName(item.names.en) === needle ||
        normalizeName(item.names.ko) === needle,
    ) ?? null
  );
}

export function overlayChampionByName(
  champions: ChampionStat[],
  name: string | null | undefined,
): OverlayChampion | null {
  return toOverlayChampion(findChampionByName(champions, name));
}

export function championIdFrom(
  champions: ChampionStat[],
  championId: number | null | undefined,
  liveName?: string | null,
): number | null {
  if (championId) return championId;
  return findChampionByName(champions, liveName)?.id ?? null;
}

function toOverlayChampion(hit: ChampionStat | null): OverlayChampion | null {
  if (!hit) return null;
  return {
    name: hit.names.ko || hit.names.en,
    grade: hit.grade,
  };
}
