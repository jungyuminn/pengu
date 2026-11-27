import type { AugmentStat } from "./augment";
import type { ChampionStat } from "./champion";
import { tierNumber, type Grade } from "./grade";

const META_CHAMPIONS = 8;
const META_AUGMENTS = 10;

export function homeMetaChampions(champions: ChampionStat[]): ChampionStat[] {
  return takeStrong(champions, META_CHAMPIONS, true);
}

export function homeMetaAugments(augments: AugmentStat[]): AugmentStat[] {
  return takeStrong(augments, META_AUGMENTS, false);
}

function takeStrong<T extends { grade: Grade; winRate: number | null; pickRate: number | null }>(
  rows: T[],
  limit: number,
  fillWithA: boolean,
): T[] {
  const ordered = [...rows].sort(byMeta);
  const s = ordered.filter((row) => row.grade === "S");
  if (!fillWithA) return (s.length ? s : ordered.filter((row) => row.grade === "A")).slice(0, limit);
  const a = ordered.filter((row) => row.grade === "A");
  const strong = [...s, ...a];
  return (strong.length ? strong : ordered).slice(0, limit);
}

function byMeta(
  left: { grade: Grade; winRate: number | null; pickRate: number | null },
  right: { grade: Grade; winRate: number | null; pickRate: number | null },
): number {
  const grade = tierNumber(left.grade) - tierNumber(right.grade);
  if (grade !== 0) return grade;
  const wins = stat(right.winRate) - stat(left.winRate);
  if (wins !== 0) return wins;
  return stat(right.pickRate) - stat(left.pickRate);
}

function stat(value: number | null): number {
  return value ?? Number.NEGATIVE_INFINITY;
}
