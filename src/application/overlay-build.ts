import type { OverlayItem } from "../domain/champion";
import type { ChampionDetail } from "../domain/champion-detail";

const MAX_CORE = 6;

export function overlayItemsFrom(detail: ChampionDetail | null): OverlayItem[] {
  if (!detail) return [];
  return detail.coreItems.slice(0, MAX_CORE).map((item) => ({
    name: item.name,
    iconUrl: item.iconUrl,
  }));
}
