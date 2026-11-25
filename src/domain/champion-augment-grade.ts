import type { AugmentStat } from "./augment";
import type { ChampionAugmentRow } from "./champion-detail";
import type { Grade } from "./grade";
import { normalizeName } from "./text";

export function championAugmentGrade(
  augment: AugmentStat,
  rows: ChampionAugmentRow[],
): Grade | null {
  if (augment.numericId != null) {
    const byId = rows.find((row) => row.id === augment.numericId);
    if (byId) return byId.grade;
  }
  const ko = normalizeName(augment.names.ko);
  const en = normalizeName(augment.names.en);
  const byName = rows.find((row) => {
    const name = normalizeName(row.name);
    return Boolean(name) && (name === ko || name === en);
  });
  return byName?.grade ?? null;
}

export function withChampionAugmentGrade(
  augment: AugmentStat,
  rows: ChampionAugmentRow[],
): AugmentStat {
  const grade = championAugmentGrade(augment, rows);
  if (!grade || grade === augment.grade) return augment;
  return { ...augment, grade };
}
