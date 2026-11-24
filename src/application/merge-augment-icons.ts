import type { ChampionDetail, ChampionTrioRow, NamedIcon } from "../domain/champion-detail";

export function emptyAugmentIcons(): Map<number, string> {
  return new Map();
}

export function mergeAugmentIcons(detail: ChampionDetail, icons: Map<number, string>): ChampionDetail {
  return {
    ...detail,
    augments: detail.augments.map((row) => ({
      ...row,
      iconUrl: (row.id != null ? icons.get(row.id) : undefined) || row.iconUrl,
    })),
    trios: detail.trios.map((trio) => ({ ...trio, icons: trioIcons(trio, icons) })),
  };
}

function trioIcons(trio: ChampionTrioRow, icons: Map<number, string>): NamedIcon[] {
  const previous = trio.icons ?? [];
  if (trio.ids?.length) {
    return trio.ids.map((id, index) => ({
      id,
      name: trio.names[index] || previous[index]?.name || "",
      iconUrl: icons.get(id) || previous[index]?.iconUrl || null,
    }));
  }
  return previous;
}
