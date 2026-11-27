import type { AugmentStat } from "./augment";
import type { ChampionAugmentRow } from "./champion-detail";
import type { Grade } from "./grade";
import { normalizeName } from "./text";

export function findChampionAugment(
  augment: AugmentStat,
  rows: ChampionAugmentRow[],
): ChampionAugmentRow | null {
  if (augment.numericId != null) {
    const byId = rows.find((row) => row.id === augment.numericId);
    if (byId) return byId;
  }
  const ko = normalizeName(augment.names.ko);
  const en = normalizeName(augment.names.en);
  return (
    rows.find((row) => {
      const name = normalizeName(row.name);
      return Boolean(name) && (name === ko || name === en);
    }) ?? null
  );
}

export function championAugmentGrade(
  augment: AugmentStat,
  rows: ChampionAugmentRow[],
): Grade | null {
  return findChampionAugment(augment, rows)?.grade ?? null;
}

export function withChampionAugmentGrade(
  augment: AugmentStat,
  rows: ChampionAugmentRow[],
): AugmentStat {
  const grade = championAugmentGrade(augment, rows);
  if (!grade || grade === augment.grade) return augment;
  return { ...augment, grade };
}
