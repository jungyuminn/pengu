import type { ChampionDetail, NamedIcon } from "../domain/champion-detail";

export function emptyAugmentDescriptions(): Map<number, string> {
  return new Map();
}

export function mergeAugmentDescriptions(
  detail: ChampionDetail,
  texts: Map<number, string>,
): ChampionDetail {
  if (texts.size === 0) return detail;
  return {
    ...detail,
    augments: detail.augments.map((row) => ({
      ...row,
      description: (row.id != null ? texts.get(row.id) : undefined) || row.description || null,
    })),
    trios: detail.trios.map((trio) => ({
      ...trio,
      icons: (trio.icons ?? []).map((icon) => withDescription(icon, texts)),
    })),
  };
}

function withDescription(icon: NamedIcon, texts: Map<number, string>): NamedIcon {
  return {
    ...icon,
    description: (icon.id != null ? texts.get(icon.id) : undefined) || icon.description || null,
  };
}
