import type { AugmentStat, StatsSnapshot } from "../domain/augment";
import type { ChampionDetail } from "../domain/champion-detail";

export function mergeDetailNames(detail: ChampionDetail, snapshot: StatsSnapshot | null): ChampionDetail {
  if (!snapshot) return detail;
  const champion = snapshot.champions.find((item) => item.id === detail.id);
  const augments = new Map(
    snapshot.augments
      .filter((item): item is AugmentStat & { numericId: number } => item.numericId != null)
      .map((item) => [item.numericId, item]),
  );

  return {
    ...detail,
    name: champion?.names.ko || detail.name,
    title: champion?.title || detail.title,
    iconUrl: champion?.iconUrl || detail.iconUrl,
    grade: champion?.grade ?? detail.grade,
    pickRate: champion?.pickRate ?? detail.pickRate,
    winRate: champion?.winRate ?? detail.winRate,
    patch: snapshot.patch || detail.patch,
    augments: detail.augments.map((row) => ({
      ...row,
      name: (row.id != null ? augments.get(row.id)?.names.ko : undefined) || row.name,
    })),
    trios: detail.trios.map((trio) => {
      const ids = trio.ids ?? [];
      const names = translatedTrioNames(ids, trio.names, augments);
      return {
        ...trio,
        ids,
        names,
        icons: names.map((name, index) => ({
          id: ids[index] ?? trio.icons?.[index]?.id ?? null,
          name,
          iconUrl: trio.icons?.[index]?.iconUrl ?? null,
        })),
      };
    }),
  };
}

function translatedTrioNames(
  ids: number[] | undefined,
  fallback: string[] | undefined,
  augments: Map<number, AugmentStat>,
): string[] {
  const translated = (ids ?? [])
    .map((id) => augments.get(id)?.names.ko)
    .filter((name): name is string => Boolean(name));
  return translated.length > 0 ? translated : fallback ?? [];
}
