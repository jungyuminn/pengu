import type { Rarity } from "../../domain/augment";
import { isBootItem, withoutBoots } from "../../domain/boots";
import type { ChampionDetail, NamedIcon } from "../../domain/champion-detail";
import { gradeFromAramggTier } from "../../domain/grade";
import type { ClientLookup } from "./client-lookup";
import { toPercent } from "./percent";
import { toRarity } from "./rarity";

const AUGMENTS_PER_RARITY = 10;
const RARITY_ORDER: Rarity[] = ["silver", "gold", "prismatic"];

interface DetailPayload {
  meta?: { gamePatch?: string };
  dataVersion?: string;
  champion?: DetailChampion;
  augments?: DetailAugment[];
  augmentTrios?: DetailTrio[];
  builds?: BuildRow[];
  build?: BuildRow;
  data?: {
    champion?: DetailChampion;
    augments?: DetailAugment[];
    augmentTrios?: DetailTrio[];
    builds?: BuildRow[];
    build?: BuildRow;
  };
}

interface DetailChampion {
  id?: number;
  alias?: string;
  name?: string;
  title?: string;
  roles?: string[];
  iconUrl?: string;
  stats?: { tier?: number | string; pickRate?: number; winRate?: number; gamePatch?: string };
}

interface DetailAugment {
  id?: number;
  name?: string;
  rarity?: string | number;
  rarityName?: string;
  iconUrl?: string;
  stats?: { tier?: number | string; rank?: number; pickRate?: number; winRate?: number };
}

interface DetailTrio {
  augmentIds?: number[];
  augments?: Array<{ name?: string }>;
  stats?: { winRate?: number };
}

interface NamedRef {
  name?: string;
  iconUrl?: string;
}

interface ItemExtension {
  coreItemIds?: number[];
  step?: number;
  itemIds?: number[];
  games?: number;
}

interface BuildRow {
  summonerSpells?: Array<{ spells?: NamedRef[]; summonerSpellIds?: number[] }>;
  skillOrders?: Array<{ skillKeys?: string[] }>;
  coreItems?: Array<{ items?: NamedRef[]; itemIds?: number[] }>;
  itemExtensions?: ItemExtension[];
  startingItems?: Array<{ items?: NamedRef[]; itemIds?: number[]; games?: number }>;
}

export function mapChampionShard(
  payload: { champions?: Record<string, DetailPayload> },
  lookup?: ClientLookup,
): ChampionDetail[] {
  return Object.values(payload.champions ?? {})
    .map((row) => mapChampionDetail(row, lookup))
    .filter((item) => item.id > 0);
}

export function mapChampionDetail(payload: DetailPayload, lookup?: ClientLookup): ChampionDetail {
  const data = payload.data ?? payload;
  const champion = data.champion ?? {};
  const grade = gradeFromAramggTier(champion.stats?.tier) ?? "C";
  const build = data.builds?.[0] ?? data.build;

  return {
    id: Number(champion.id) || 0,
    name: champion.name || champion.alias || "",
    title: champion.title || "",
    key: champion.alias || "",
    iconUrl: champion.iconUrl || null,
    roles: champion.roles ?? [],
    grade,
    pickRate: toPercent(champion.stats?.pickRate),
    winRate: toPercent(champion.stats?.winRate),
    patch: payload.meta?.gamePatch ?? champion.stats?.gamePatch ?? "unknown",
    augments: mapAugments(data.augments ?? []),
    coreItems: recommendedItems(build, lookup),
    startingItems: resolveIcons(bestStart(build?.startingItems), lookup?.items),
    summoners: resolveIcons(build?.summonerSpells?.[0], lookup?.spells, "summonerSpellIds"),
    skillOrder: skillPriority(build?.skillOrders?.[0]?.skillKeys ?? []),
    trios: (data.augmentTrios ?? []).slice(0, 3).map((trio) => {
      const ids = (trio.augmentIds ?? []).map(Number).filter((id) => id > 0);
      const names = (trio.augments ?? []).map((item) => item.name || "").filter(Boolean);
      return {
        ids,
        names,
        icons: ids.map((id, index) => ({ id, name: names[index] || "", iconUrl: null })),
        winRate: toPercent(trio.stats?.winRate),
      };
    }),
  };
}

function mapAugments(rows: DetailAugment[]) {
  const mapped = rows
    .slice()
    .sort((left, right) => (left.stats?.rank ?? 999) - (right.stats?.rank ?? 999))
    .flatMap((row) => {
      const grade = gradeFromAramggTier(row.stats?.tier);
      if (!grade || !row.name) return [];
      return [
        {
          id: Number(row.id) > 0 ? Number(row.id) : null,
          name: row.name,
          grade,
          rarity: toRarity(row.rarityName ?? row.rarity),
          pickRate: toPercent(row.stats?.pickRate),
          winRate: toPercent(row.stats?.winRate),
          iconUrl: row.iconUrl || null,
        },
      ];
    });

  return RARITY_ORDER.flatMap((rarity) =>
    mapped.filter((row) => row.rarity === rarity).slice(0, AUGMENTS_PER_RARITY),
  );
}

const ITEM_SLOTS = 6;

function recommendedItems(build: BuildRow | undefined, lookup?: ClientLookup): NamedIcon[] {
  const coreRow = build?.coreItems?.[0];
  const core = resolveIcons(coreRow, lookup?.items);
  const extraIds = bestExtensionIds(idsOf(coreRow), build?.itemExtensions ?? []);
  const seen = new Set(core.flatMap((item) => (item.id != null ? [item.id] : [])));
  const extra = extraIds.flatMap((id) => {
    if (seen.has(id)) return [];
    const hit = lookup?.items.get(id);
    if (!hit || isBootItem({ id, name: hit.name })) return [];
    seen.add(id);
    return [{ id, name: hit.name, iconUrl: hit.iconUrl }];
  });
  return withoutBoots([...core, ...extra]).slice(0, ITEM_SLOTS);
}

function bestExtensionIds(coreIds: number[], rows: ItemExtension[]): number[] {
  if (!coreIds.length) return [];
  const matches = rows.filter((row) => sameIds(row.coreItemIds ?? [], coreIds));
  const picked: number[] = [];
  const have = new Set(coreIds);

  for (const step of [1, 2, 3]) {
    const candidates = matches
      .filter((row) => row.step === step)
      .sort((left, right) => (right.games ?? 0) - (left.games ?? 0));
    const continued = candidates.find((row) => picked.every((id) => (row.itemIds ?? []).includes(id)));
    const hit = continued ?? candidates[0];
    if (!hit) continue;
    for (const id of hit.itemIds ?? []) {
      if (!Number.isFinite(id) || id <= 0 || have.has(id) || isBootItem({ id, name: "" })) continue;
      have.add(id);
      picked.push(id);
      break;
    }
  }
  return picked;
}

function sameIds(left: number[], right: number[]): boolean {
  if (left.length !== right.length) return false;
  const a = [...left].sort((x, y) => x - y);
  const b = [...right].sort((x, y) => x - y);
  return a.every((id, index) => id === b[index]);
}

function idsOf(row: { itemIds?: number[] } | undefined): number[] {
  return (row?.itemIds ?? []).filter((id) => Number.isFinite(id) && id > 0);
}

function bestStart(rows: BuildRow["startingItems"]) {
  return (rows ?? []).slice().sort((left, right) => (right.games ?? 0) - (left.games ?? 0))[0];
}

function resolveIcons(
  row: { items?: NamedRef[]; spells?: NamedRef[]; itemIds?: number[]; summonerSpellIds?: number[] } | undefined,
  lookup: Map<number, NamedIcon> | undefined,
  idKey: "itemIds" | "summonerSpellIds" = "itemIds",
): NamedIcon[] {
  const named = row?.items ?? row?.spells;
  if (named?.length) {
    return named.flatMap((item) => {
      if (!item.name) return [];
      return [{ name: item.name, iconUrl: item.iconUrl || null }];
    });
  }
  const ids = row?.[idKey] ?? [];
  return ids.flatMap((id) => {
    const hit = lookup?.get(id);
    return hit ? [{ id, name: hit.name, iconUrl: hit.iconUrl }] : [];
  });
}

const SKILL_MAX_RANK = 5;

export function skillPriority(keys: string[]): string {
  const normalized = keys.map((key) => key.trim().toUpperCase()).filter(Boolean);
  if (!normalized.length) return "";

  const counts = new Map<string, number>();
  for (const key of normalized) counts.set(key, (counts.get(key) ?? 0) + 1);
  const includeR = (counts.get("R") ?? 0) >= SKILL_MAX_RANK;
  const relevant = normalized.filter((key) => key !== "R" || includeR);

  const progress = new Map<string, number>();
  const maxed: string[] = [];
  for (const key of relevant) {
    const next = (progress.get(key) ?? 0) + 1;
    progress.set(key, next);
    if (next >= SKILL_MAX_RANK && !maxed.includes(key)) maxed.push(key);
  }
  if (maxed.length) {
    const rest = [...progress.keys()].filter((key) => !maxed.includes(key));
    rest.sort(
      (left, right) =>
        (progress.get(right) ?? 0) - (progress.get(left) ?? 0) || relevant.indexOf(left) - relevant.indexOf(right),
    );
    return [...maxed, ...rest].join(" > ");
  }

  const seen: string[] = [];
  for (const key of relevant) {
    if (!seen.includes(key)) seen.push(key);
  }
  return seen.join(" > ");
}
