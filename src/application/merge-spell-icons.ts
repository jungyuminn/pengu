import type { ChampionDetail, NamedIcon } from "../domain/champion-detail";

export function emptySpellIcons(): Map<string, string> {
  return new Map();
}

export function mergeSpellIcons(detail: ChampionDetail, icons: Map<string, string>): ChampionDetail {
  if (icons.size === 0) return detail;
  return {
    ...detail,
    summoners: detail.summoners.map((item) => {
      const iconUrl = spellIconFor(item, icons);
      return iconUrl ? { ...item, iconUrl } : item;
    }),
  };
}

function spellIconFor(item: NamedIcon, icons: Map<string, string>): string | null {
  const keys = [item.id != null ? String(item.id) : "", item.name, item.name.trim().toLowerCase()].filter(Boolean);
  for (const key of keys) {
    const hit = icons.get(key);
    if (hit) return hit;
  }
  return null;
}
