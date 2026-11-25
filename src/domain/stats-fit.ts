import type { Grade } from "./grade";

export const AUGMENT_FIT_WEIGHT: Record<Grade, number> = {
  S: 1,
  A: 0.7,
  B: 0.35,
  C: 0.1,
};

const AUGMENT_SHARE = 0.65;
const ITEM_SHARE = 0.35;

export interface StatsFitInput {
  augmentGrades: Array<Grade | null>;
  itemIds: number[];
  coreItemIds: number[];
}

export interface StatsFit {
  percent: number;
  augmentHits: number;
  augmentTotal: number;
  itemHits: number;
  itemTotal: number;
  matchedAugmentIds: number[];
  matchedItemIds: number[];
  ignoreItemIds: number[];
  gradeCounts: Record<Grade, number>;
  gradesById: Record<number, Grade>;
}

export function statsFit(input: StatsFitInput): StatsFit | null {
  const grades = input.augmentGrades;
  const items = uniq(input.itemIds);
  const core = uniq(input.coreItemIds);
  const parts: Array<{ share: number; value: number }> = [];

  const gradeCounts: Record<Grade, number> = { S: 0, A: 0, B: 0, C: 0 };
  for (const grade of grades) {
    if (grade) gradeCounts[grade] += 1;
  }

  if (grades.length) {
    const augmentScore =
      grades.reduce((sum, grade) => sum + (grade ? AUGMENT_FIT_WEIGHT[grade] : 0), 0) / grades.length;
    parts.push({ share: AUGMENT_SHARE, value: augmentScore });
  }

  const itemWeights = sequentialWeights(core.length);
  const matchedItemIds = core.filter((id) => items.includes(id));
  if (core.length) {
    const itemScore = core.reduce((sum, id, index) => sum + (items.includes(id) ? itemWeights[index] ?? 0 : 0), 0);
    parts.push({ share: ITEM_SHARE, value: itemScore });
  }
  if (!parts.length) return null;

  const shareTotal = parts.reduce((sum, part) => sum + part.share, 0);
  const percent = Math.round((parts.reduce((sum, part) => sum + part.share * part.value, 0) / shareTotal) * 100);

  return {
    percent,
    augmentHits: gradeCounts.S + gradeCounts.A,
    augmentTotal: grades.length,
    itemHits: matchedItemIds.length,
    itemTotal: core.length,
    matchedAugmentIds: [],
    matchedItemIds,
    ignoreItemIds: [],
    gradeCounts,
    gradesById: {},
  };
}

export function sequentialWeights(count: number): number[] {
  if (count <= 0) return [];
  const raw = Array.from({ length: count }, (_, index) => count - index);
  const total = raw.reduce((sum, value) => sum + value, 0);
  return raw.map((value) => value / total);
}

function uniq(ids: number[]): number[] {
  return [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];
}
