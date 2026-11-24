import type { StatsSnapshot } from "../domain/augment";
import type { ChampionStat } from "../domain/champion";
import type { ChampionDetail } from "../domain/champion-detail";
import type { ChampionPortraits } from "./ports";

export function mergeChampionIcons(snapshot: StatsSnapshot, portraits: ChampionPortraits): StatsSnapshot {
  return {
    ...snapshot,
    champions: snapshot.champions.map((champion) => withPortrait(champion, portraits)),
  };
}

export function mergeDetailPortrait(detail: ChampionDetail, portraits: ChampionPortraits): ChampionDetail {
  const iconUrl = portraits.url(detail.key);
  return iconUrl ? { ...detail, iconUrl } : detail;
}

function withPortrait(champion: ChampionStat, portraits: ChampionPortraits): ChampionStat {
  const iconUrl = portraits.url(champion.key);
  return iconUrl ? { ...champion, iconUrl } : champion;
}
