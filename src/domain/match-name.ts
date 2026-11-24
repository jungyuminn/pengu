import type { AugmentStat } from "./augment";
import { levenshtein, normalizeName } from "./text";

const MAX_DISTANCE = 2;

export function matchAugment(query: string, augments: AugmentStat[]): AugmentStat | null {
  const needle = normalizeName(query);
  if (!needle) return null;

  let best: AugmentStat | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const augment of augments) {
    const names = [augment.names.ko, augment.names.en];
    for (const name of names) {
      const haystack = normalizeName(name);
      if (!haystack) continue;
      if (haystack === needle) return augment;
      if (haystack.includes(needle) || needle.includes(haystack)) {
        const score = Math.abs(haystack.length - needle.length);
        if (score < bestScore) {
          best = augment;
          bestScore = score;
        }
        continue;
      }
      const distance = levenshtein(needle, haystack);
      if (distance <= MAX_DISTANCE && distance < bestScore) {
        best = augment;
        bestScore = distance;
      }
    }
  }

  return best;
}
