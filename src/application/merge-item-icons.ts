import type { ChampionDetail, NamedIcon } from "../domain/champion-detail";

export function emptyItemIcons(): Map<string, string> {
  return new Map();
}

export function mergeItemIcons(detail: ChampionDetail, icons: Map<string, string>): ChampionDetail {
  if (icons.size === 0) return detail;
  return {
    ...detail,
    coreItems: detail.coreItems.map((item) => withIcon(item, icons)),
    startingItems: detail.startingItems.map((item) => withIcon(item, icons)),
  };
}

function withIcon(item: NamedIcon, icons: Map<string, string>): NamedIcon {
  const iconUrl = itemIconFor(item, icons);
  return iconUrl ? { ...item, iconUrl } : item;
}

function itemIconFor(item: NamedIcon, icons: Map<string, string>): string | null {
  const keys = [item.id != null ? String(item.id) : "", item.name, item.name.trim().toLowerCase()].filter(Boolean);
  for (const key of keys) {
    const hit = icons.get(key);
    if (hit) return hit;
  }
  return null;
}
