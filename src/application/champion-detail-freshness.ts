import type { ChampionDetail } from "../domain/champion-detail";
import type { CachedChampionDetail } from "./ports";

export const CHAMPION_DETAIL_SCHEMA = 6;

export function hasUsableChampionDetail(detail: ChampionDetail): boolean {
  return detail.augments.length > 0 && (detail.coreItems.length > 0 || detail.summoners.length > 0);
}

export function isFreshChampionDetail(cached: CachedChampionDetail, patch?: string): boolean {
  return (
    cached.schema === CHAMPION_DETAIL_SCHEMA &&
    (!patch || cached.detail.patch === patch) &&
    hasUsableChampionDetail(cached.detail)
  );
}
