import type { ChampionName } from "./ports";
import type { ChampionStat } from "../domain/champion";
import type { StatsSnapshot } from "../domain/augment";
import { normalizeName } from "../domain/text";

export function mergeChampionNames(stats: StatsSnapshot, names: ChampionName[]): StatsSnapshot {
  const byKey = new Map(names.map((item) => [normalizeName(item.key), item]));
  const byId = new Map(names.filter((item) => item.id > 0).map((item) => [item.id, item]));

  return {
    ...stats,
    champions: stats.champions.map((champion) => mergeOne(champion, byKey, byId)),
  };
}

function mergeOne(
  champion: ChampionStat,
  byKey: Map<string, ChampionName>,
  byId: Map<number, ChampionName>,
): ChampionStat {
  const hit = (champion.id > 0 ? byId.get(champion.id) : undefined) ?? byKey.get(normalizeName(champion.key));
  if (!hit) return champion;
  return {
    ...champion,
    names: {
      ko: hit.name || champion.names.ko,
      en: champion.names.en || hit.key,
    },
  };
}
