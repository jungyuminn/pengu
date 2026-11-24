export const MIN_OFFER_CARDS = 3;

export type PixelAt = (x: number, y: number) => readonly [number, number, number];

const FILL_YS = [0.58, 0.66, 0.74, 0.82];

export function isOfferMetal(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (r >= 140 && g >= 100 && b <= 120 && r >= b + 35) return true;
  if (max >= 125 && max - min <= 48) return true;
  if (max >= 130 && max - min >= 55) {
    if (b >= r + 50 && b >= g + 30 && g < 160) return false;
    return true;
  }
  return false;
}

export function isOfferFill(r: number, g: number, b: number): boolean {
  return r + g + b < 140;
}

export function slotLooksLikeOffer(metalRatio: number, fillRatio: number): boolean {
  return metalRatio >= 0.08 && fillRatio >= 0.3;
}

export function offerSlotLooksLike(width: number, height: number, at: PixelAt): boolean {
  const { metal, fill } = measureOfferSlot(width, height, at);
  return slotLooksLikeOffer(metal, fill);
}

export function measureOfferSlot(
  width: number,
  height: number,
  at: PixelAt,
): { metal: number; fill: number } {
  if (width < 16 || height < 16) return { metal: 0, fill: 0 };
  const x0 = Math.round(width * 0.1);
  const x1 = Math.round(width * 0.9);
  let metal = 0;
  let metalN = 0;
  let fill = 0;
  let fillN = 0;
  const metalY0 = Math.round(height * 0.04);
  const metalY1 = Math.max(metalY0 + 1, Math.round(height * 0.2));
  const fillY0 = Math.round(height * 0.36);
  const fillY1 = Math.max(fillY0 + 1, Math.round(height * 0.84));
  for (let y = metalY0; y < metalY1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const [r, g, b] = at(x, y);
      metalN += 1;
      if (isOfferMetal(r, g, b)) metal += 1;
    }
  }
  for (let y = fillY0; y < fillY1; y += 3) {
    for (let x = x0; x < x1; x += 3) {
      const [r, g, b] = at(x, y);
      fillN += 1;
      if (isOfferFill(r, g, b)) fill += 1;
    }
  }
  return { metal: metalN ? metal / metalN : 0, fill: fillN ? fill / fillN : 0 };
}

export function offerCardsVisible(count: number): boolean {
  return count === 3 || count === 4;
}

export function countOfferFrames(width: number, height: number, at: PixelAt): number {
  if (width < 32 || height < 32) return 0;
  const minRun = Math.max(16, Math.round(width * 0.08));
  const maxRun = Math.round(width * 0.36);
  const gap = Math.max(4, Math.round(width * 0.012));
  const runs: Array<{ x0: number; x1: number }> = [];
  const yEnd = clamp(Math.round(height * 0.32), 8, height - 1);
  for (let y = 1; y <= yEnd; y += 4) {
    runs.push(...metalRuns(width, y, at, minRun, maxRun, gap));
  }
  const clusters = clusterRuns(runs);
  let cards = 0;
  for (const cluster of clusters) {
    const span = cluster.x1 - cluster.x0;
    if (cluster.hits < 2 || span < minRun || span > maxRun) continue;
    if (fillRatio(width, height, cluster.x0, cluster.x1, at) < 0.2) continue;
    cards += 1;
  }
  return cards;
}

function metalRuns(
  width: number,
  y: number,
  at: PixelAt,
  minRun: number,
  maxRun: number,
  gap: number,
): Array<{ x0: number; x1: number }> {
  const found: Array<{ x0: number; x1: number }> = [];
  let start = -1;
  let last = -1;
  for (let x = 0; x < width; x += 2) {
    const [r, g, b] = at(x, y);
    if (isOfferMetal(r, g, b)) {
      if (start < 0) start = x;
      last = x;
      continue;
    }
    if (start >= 0 && x - last <= gap) continue;
    addRun(found, start, last, minRun, maxRun);
    start = -1;
    last = -1;
  }
  addRun(found, start, last, minRun, maxRun);
  return found;
}

function addRun(
  found: Array<{ x0: number; x1: number }>,
  start: number,
  last: number,
  minRun: number,
  maxRun: number,
): void {
  if (start < 0 || last < start) return;
  const span = last - start;
  if (span < minRun || span > maxRun) return;
  found.push({ x0: start, x1: last });
}

function clusterRuns(runs: Array<{ x0: number; x1: number }>): Array<{ x0: number; x1: number; hits: number }> {
  const clusters: Array<{ x0: number; x1: number; hits: number }> = [];
  const sorted = [...runs].sort((left, right) => left.x0 - right.x0 || left.x1 - right.x1);
  for (const run of sorted) {
    const hit = clusters.find((cluster) => run.x0 < cluster.x1 && run.x1 > cluster.x0);
    if (!hit) {
      clusters.push({ x0: run.x0, x1: run.x1, hits: 1 });
      continue;
    }
    hit.x0 = Math.min(hit.x0, run.x0);
    hit.x1 = Math.max(hit.x1, run.x1);
    hit.hits += 1;
  }
  return clusters;
}

function fillRatio(width: number, height: number, x0: number, x1: number, at: PixelAt): number {
  const left = clamp(x0 + Math.round((x1 - x0) * 0.18), 0, width - 1);
  const right = clamp(x1 - Math.round((x1 - x0) * 0.18), left, width - 1);
  let dark = 0;
  let n = 0;
  for (const t of FILL_YS) {
    const y = clamp(Math.round(height * t), 0, height - 1);
    for (let x = left; x <= right; x += 8) {
      const [r, g, b] = at(x, y);
      n += 1;
      if (isOfferFill(r, g, b)) dark += 1;
    }
  }
  return n ? dark / n : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
