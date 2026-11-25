import type { AugmentStat } from "../domain/augment";
import type { ChampionStat } from "../domain/champion";
import { formatKda } from "../domain/kda";
import { pickMvpIndex } from "../domain/match-mvp";
import type { MayhemMatch, MayhemPlayer } from "../domain/mayhem";

export interface HomeMatchAssets {
  augmentIcons: Map<number, string>;
  augmentTexts: Map<number, string>;
  itemIcons: Map<string, string>;
  itemNames: Map<number, string>;
  itemTexts: Map<number, string>;
  spellIcons: Map<string, string>;
}

export interface HomeMatchPlayer {
  puuid: string;
  name: string;
  self: boolean;
  mvp: boolean;
  teamId: number;
  championId: number;
  championName: string;
  championIconUrl: string | null;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  kda: string;
  level: number;
  gold: number;
  damage: number;
  cs: number;
  spells: Array<{ id: number; iconUrl: string | null }>;
  items: Array<{ id: number; name: string; iconUrl: string | null; description: string | null }>;
  augments: Array<{ id: number; name: string; iconUrl: string | null; description: string | null }>;
}

export function toHomePlayers(
  match: MayhemMatch,
  selfPuuid: string,
  champions: ChampionStat[],
  augments: AugmentStat[],
  assets: HomeMatchAssets,
): HomeMatchPlayer[] {
  const mvpIndex = pickMvpIndex(match.players ?? []);
  return (match.players ?? []).map((row, index) =>
    toHomePlayer(row, selfPuuid, champions, augments, assets, index === mvpIndex),
  );
}

function toHomePlayer(
  row: MayhemPlayer,
  selfPuuid: string,
  champions: ChampionStat[],
  augments: AugmentStat[],
  assets: HomeMatchAssets,
  mvp: boolean,
): HomeMatchPlayer {
  const champion = champions.find((item) => item.id === row.championId);
  return {
    puuid: row.puuid,
    name: row.tagLine ? `${row.gameName}#${row.tagLine}` : row.gameName,
    self: Boolean(row.puuid) && row.puuid === selfPuuid,
    mvp,
    teamId: row.teamId,
    championId: row.championId,
    championName: champion?.names.ko || champion?.names.en || `#${row.championId}`,
    championIconUrl: champion?.iconUrl ?? null,
    win: row.win,
    kills: row.kills,
    deaths: row.deaths,
    assists: row.assists,
    kda: formatKda(row.kills, row.deaths, row.assists),
    level: row.level,
    gold: row.gold,
    damage: row.damage,
    cs: row.cs,
    spells: row.spellIds.map((id) => ({ id, iconUrl: assets.spellIcons.get(String(id)) ?? null })),
    items: row.itemIds.map((id) => ({
      id,
      name: id > 0 ? (assets.itemNames.get(id) ?? "") : "",
      iconUrl: id > 0 ? (assets.itemIcons.get(String(id)) ?? null) : null,
      description: id > 0 ? (assets.itemTexts.get(id) ?? null) : null,
    })),
    augments: row.augmentIds.map((id) => ({
      id,
      name: augments.find((item) => item.numericId === id)?.names.ko || "",
      iconUrl: assets.augmentIcons.get(id) ?? null,
      description: assets.augmentTexts.get(id) ?? null,
    })),
  };
}
