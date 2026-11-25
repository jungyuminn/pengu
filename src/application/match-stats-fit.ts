import type { ChampionDetail } from "../domain/champion-detail";
import { isBootItem } from "../domain/boots";
import type { Grade } from "../domain/grade";
import { statsFit, type StatsFit } from "../domain/stats-fit";

export type { StatsFit };

export interface MatchFitPlayer {
  key: string;
  championId: number;
  itemIds: number[];
  augmentIds: number[];
}

export function matchStatsFit(players: MatchFitPlayer[], details: Map<number, ChampionDetail>): Record<string, StatsFit> {
  const result: Record<string, StatsFit> = {};
  for (const row of players) {
    const detail = details.get(row.championId);
    const augs = uniq(row.augmentIds);
    const fit = statsFit({
      augmentGrades: augs.map((id) => gradeOf(detail, id)),
      itemIds: uniq(row.itemIds).filter((id) => !isBootItem({ id, name: "" })),
      coreItemIds: coreItemIds(detail),
    });
    if (!fit) continue;
    const gradesById: Record<number, Grade> = {};
    for (const id of augs) {
      const grade = gradeOf(detail, id);
      if (grade) gradesById[id] = grade;
    }
    result[row.key] = {
      ...fit,
      gradesById,
      matchedAugmentIds: augs.filter((id) => {
        const grade = gradesById[id];
        return grade === "S" || grade === "A";
      }),
      ignoreItemIds: uniq(row.itemIds).filter((id) => isBootItem({ id, name: "" })),
    };
  }
  return result;
}

function gradeOf(detail: ChampionDetail | undefined, id: number): Grade | null {
  const row = detail?.augments.find((item) => item.id === id);
  return row?.grade ?? null;
}

function coreItemIds(detail: ChampionDetail | undefined): number[] {
  if (!detail) return [];
  const seen = new Set<number>();
  return detail.coreItems.flatMap((item) => {
    if (item.id == null || item.id <= 0 || isBootItem(item) || seen.has(item.id)) return [];
    seen.add(item.id);
    return [item.id];
  });
}

function uniq(ids: number[]): number[] {
  return [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];
}
