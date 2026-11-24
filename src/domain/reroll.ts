import {
  clampBox,
  rerollButtonRegions,
  type AugmentCardLayout,
  type PixelBox,
} from "./augment-layout";
import type { PixelAt } from "./offer-frame";

const MIN_RATIO = 0.08;
const MIN_VISIBLE_SLOTS = 2;
const MUTED_EDGE = 7;

export function isRerollGold(r: number, g: number, b: number): boolean {
  return r >= 100 && g >= 70 && g <= 190 && b <= 135;
}

export function isRerollIdle(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max >= 65 && max <= 190 && max - min <= 60;
}

export function isRerollButtonPixel(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const spread = max - min;
  if (isRerollIdle(r, g, b) || isRerollGold(r, g, b)) return true;
  if (g >= 105 && b >= 105 && r <= 120) return true;
  return max >= 145 && min >= 105 && spread <= 85;
}

export function rerollButtonsVisible(
  width: number,
  height: number,
  at: PixelAt,
  layout: AugmentCardLayout,
): boolean {
  const active = rerollButtonRegions(width, height, layout).filter((box) =>
    rerollButtonActive(width, height, at, clampBox(box, width, height), layout.modern),
  ).length;
  return active >= MIN_VISIBLE_SLOTS;
}

export function rerollButtonActive(
  width: number,
  height: number,
  at: PixelAt,
  box: PixelBox,
  modern: boolean,
): boolean {
  let buttonLike = 0;
  let n = 0;
  const stepX = Math.max(1, Math.floor(box.width / 120));
  const stepY = Math.max(1, Math.floor(box.height / 48));
  for (let y = box.top; y < box.top + box.height; y += stepY) {
    for (let x = box.left; x < box.left + box.width; x += stepX) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const [r, g, b] = at(x, y);
      n += 1;
      if (isRerollButtonPixel(r, g, b)) buttonLike += 1;
    }
  }
  if (n && buttonLike / n >= MIN_RATIO) return true;
  return modern && mutedRerollVisible(width, height, at, box);
}

function mutedRerollVisible(width: number, height: number, at: PixelAt, box: PixelBox): boolean {
  if (box.height < 20) return false;
  const left = box.left + Math.floor(box.width * 0.22);
  const right = box.left + Math.ceil(box.width * 0.78);
  const rowMean = (y: number): number => {
    let total = 0;
    let n = 0;
    for (let x = left; x < right; x += 1) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const [r, g, b] = at(x, y);
      total += (r + g + b) / 3;
      n += 1;
    }
    return n ? total / n : 0;
  };
  const topEdge = Math.max(
    ...Array.from({ length: Math.min(12, box.height) }, (_, index) => rowMean(box.top + 3 + index)),
  );
  const interiorRows = Array.from({ length: Math.min(18, box.height) }, (_, index) =>
    rowMean(box.top + 17 + index),
  );
  if (!interiorRows.length) return false;
  const interior = interiorRows.reduce((sum, value) => sum + value, 0) / interiorRows.length;
  return topEdge - interior >= MUTED_EDGE;
}
