import type { AugmentStat, Rarity, StatsSnapshot } from "../domain/augment";
import type { ChampionStat } from "../domain/champion";
import type { Grade } from "../domain/grade";
import { averageKda, formatKda } from "../domain/kda";
import type { MayhemProfile } from "../domain/mayhem";
import { toHomePlayers, type HomeMatchAssets, type HomeMatchPlayer } from "./home-match-players";
import { profileIconUrl } from "./profile-icon";

export type { HomeMatchPlayer };

const META_CHAMPIONS = 8;
const META_AUGMENTS_PER_RARITY = 2;
const HOME_MATCHES = 20;
const RARITIES: Rarity[] = ["silver", "gold", "prismatic"];

export interface HomeChampion {
  id: number;
  name: string;
  iconUrl: string | null;
  grade: Grade;
  pickRate: number | null;
  winRate: number | null;
}

export interface HomeAugment {
  id: number | null;
  name: string;
  iconUrl: string | null;
  rarity: Rarity;
  grade: Grade;
  pickRate: number | null;
  winRate: number | null;
}

export interface HomeMatch {
  gameId: number;
  playedAt: number;
  championId: number;
  championName: string;
  championIconUrl: string | null;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  kda: string;
  durationSec: number;
  mvp: boolean;
  augments: Array<{ id: number; name: string; iconUrl: string | null; description: string | null }>;
  players: HomeMatchPlayer[];
}

export interface HomeFeed {
  patch: string;
  metaChampions: HomeChampion[];
  metaAugments: HomeAugment[];
  account: { puuid: string; gameName: string; tagLine: string; iconUrl: string | null } | null;
  games: number;
  wins: number;
  winRate: number | null;
  kda: string | null;
  matches: HomeMatch[];
}

export function buildHomeFeed(
  snapshot: StatsSnapshot | null,
  profile: MayhemProfile | null,
  augmentIcons: Map<number, string>,
  augmentTexts: Map<number, string> = new Map(),
  itemIcons: Map<string, string> = new Map(),
  spellIcons: Map<string, string> = new Map(),
  itemNames: Map<number, string> = new Map(),
  itemTexts: Map<number, string> = new Map(),
): HomeFeed {
  const champions = snapshot?.champions ?? [];
  const augments = snapshot?.augments ?? [];
  const matches = profile?.matches ?? [];
  const wins = matches.filter((row) => row.win).length;
  const assets: HomeMatchAssets = { augmentIcons, augmentTexts, itemIcons, itemNames, itemTexts, spellIcons };

  return {
    patch: snapshot?.patch ?? "",
    metaChampions: [...champions]
      .sort((left, right) => (right.pickRate ?? 0) - (left.pickRate ?? 0))
      .slice(0, META_CHAMPIONS)
      .map(toHomeChampion),
    metaAugments: RARITIES.flatMap((rarity) =>
      augments
        .filter((row) => row.rarity === rarity)
        .slice()
        .sort((left, right) => (right.pickRate ?? 0) - (left.pickRate ?? 0))
        .slice(0, META_AUGMENTS_PER_RARITY)
        .map((row) => toHomeAugment(row, augmentIcons)),
    ),
    account: profile
      ? {
          puuid: profile.puuid,
          gameName: profile.gameName,
          tagLine: profile.tagLine,
          iconUrl: profileIconUrl(profile.profileIconId),
        }
      : null,
    games: matches.length,
    wins,
    winRate: matches.length ? (wins / matches.length) * 100 : null,
    kda: averageKda(matches),
    matches: matches.slice(0, HOME_MATCHES).map((row) => {
      const players = toHomePlayers(row, profile?.puuid ?? "", champions, augments, assets);
      return {
        gameId: row.gameId,
        playedAt: row.playedAt,
        championId: row.championId,
        championName: championName(champions, row.championId),
        championIconUrl: champions.find((item) => item.id === row.championId)?.iconUrl ?? null,
        win: row.win,
        kills: row.kills,
        deaths: row.deaths,
        assists: row.assists,
        kda: formatKda(row.kills, row.deaths, row.assists),
        durationSec: row.durationSec || 0,
        mvp: players.some((player) => player.self && player.mvp),
        augments: row.augmentIds.map((id) => ({
          id,
          name: augmentName(augments, id),
          iconUrl: augmentIcons.get(id) ?? null,
          description: augmentTexts.get(id) ?? null,
        })),
        players,
      };
    }),
  };
}

function toHomeChampion(item: ChampionStat): HomeChampion {
  return {
    id: item.id,
    name: item.names.ko || item.names.en,
    iconUrl: item.iconUrl,
    grade: item.grade,
    pickRate: item.pickRate,
    winRate: item.winRate,
  };
}

function toHomeAugment(row: AugmentStat, icons: Map<number, string>): HomeAugment {
  const id = row.numericId;
  return {
    id,
    name: row.names.ko || row.names.en,
    iconUrl: id != null ? (icons.get(id) ?? null) : null,
    rarity: row.rarity,
    grade: row.grade,
    pickRate: row.pickRate,
    winRate: row.winRate,
  };
}

function championName(champions: ChampionStat[], id: number): string {
  return champions.find((item) => item.id === id)?.names.ko || `#${id}`;
}

function augmentName(augments: AugmentStat[], id: number): string {
  return augments.find((row) => row.numericId === id)?.names.ko || "";
}
