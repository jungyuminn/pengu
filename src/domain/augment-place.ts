import type { AugmentStat } from "./augment";
import { findChampionAugment } from "./champion-augment-grade";
import type { ChampionAugmentRow } from "./champion-detail";
import { tierNumber, type Grade } from "./grade";

export function augmentCatalogPlace(
  augments: AugmentStat[],
  id: string | null | undefined,
): { rank: number; total: number } | null {
  if (!id) return null;
  return placeOf(augments, (row) => row.id === id);
}

export function augmentChampionPlace(
  rows: ChampionAugmentRow[],
  augment: AugmentStat,
): { rank: number; total: number } | null {
  const hit = findChampionAugment(augment, rows);
  if (!hit) return null;
  return placeOf(rows, (row) => row === hit);
}

function placeOf<T extends { grade: Grade; winRate: number | null; pickRate: number | null }>(
  rows: T[],
  same: (row: T) => boolean,
): { rank: number; total: number } | null {
  const total = rows.length;
  if (total <= 0) return null;
  const ordered = rows.slice().sort((left, right) => {
    const grade = tierNumber(left.grade) - tierNumber(right.grade);
    if (grade !== 0) return grade;
    const wins = stat(right.winRate) - stat(left.winRate);
    if (wins !== 0) return wins;
    return stat(right.pickRate) - stat(left.pickRate);
  });
  const index = ordered.findIndex(same);
  if (index < 0) return null;
  return { rank: index + 1, total };
}

function stat(value: number | null): number {
  return value ?? Number.NEGATIVE_INFINITY;
}
