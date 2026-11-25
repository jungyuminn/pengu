import type { AugmentStat } from "./augment";
import { MAX_OFFER_CARDS } from "./mayhem-augment";
import { levenshtein, normalizeName } from "./text";

function closeContained(left: string, right: string): boolean {
  if (!left.includes(right) && !right.includes(left)) return false;
  const shorter = Math.min(left.length, right.length);
  const longer = Math.max(left.length, right.length);
  if (shorter < 4) return false;
  return longer - shorter <= 4 || longer / shorter <= 1.45;
}

function allowedDistance(left: number, right: number): number {
  const len = Math.min(left, right);
  if (len < 4) return 0;
  if (len >= 5) return 3;
  return 2;
}

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
      if (closeContained(needle, haystack)) {
        const score = Math.abs(haystack.length - needle.length);
        if (score < bestScore) {
          best = augment;
          bestScore = score;
        }
        continue;
      }
      const distance = levenshtein(needle, haystack);
      if (distance <= allowedDistance(needle.length, haystack.length) && distance < bestScore) {
        best = augment;
        bestScore = distance;
      }
    }
  }

  return best;
}

export function augmentsInText(text: string, augments: AugmentStat[]): AugmentStat[] {
  const haystack = normalizeName(text);
  if (!haystack) return [];
  const hits: Array<{ augment: AugmentStat; at: number }> = [];
  for (const augment of augments) {
    for (const name of [augment.names.ko, augment.names.en]) {
      const needle = normalizeName(name);
      if (needle.length < 3 || needle.startsWith("aram")) continue;
      const at = haystack.indexOf(needle);
      if (at < 0) continue;
      hits.push({ augment, at });
      break;
    }
  }
  hits.sort((left, right) => left.at - right.at);
  const seen = new Set<string>();
  const ordered: AugmentStat[] = [];
  for (const hit of hits) {
    if (seen.has(hit.augment.id)) continue;
    seen.add(hit.augment.id);
    ordered.push(hit.augment);
    if (ordered.length >= MAX_OFFER_CARDS) break;
  }
  return ordered;
}
