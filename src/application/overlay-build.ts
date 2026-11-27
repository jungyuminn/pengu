import type { OverlayItem } from "../domain/champion";
import type { ChampionDetail } from "../domain/champion-detail";

const MAX_CORE = 6;

export function overlayItemsFrom(detail: ChampionDetail | null): OverlayItem[] {
  if (!detail) return [];
  return detail.coreItems.slice(0, MAX_CORE).map((item) => ({
    id: item.id ?? null,
    name: item.name,
    iconUrl: item.iconUrl,
    owned: false,
  }));
}

export function withOwnedOverlayItems(items: OverlayItem[], ownedIds: readonly number[]): OverlayItem[] {
  const have = new Set(ownedIds.filter((id) => id > 0));
  return items.map((item) => ({
    ...item,
    owned: item.id != null && have.has(item.id),
  }));
}
