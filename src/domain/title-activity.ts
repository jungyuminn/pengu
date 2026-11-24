import { clampBox, titleActivityRegions, type AugmentCardLayout, type PixelBox } from "./augment-layout";
import type { PixelAt } from "./offer-frame";

const ACTIVE_BRIGHT = 0.012;
const WEAK_BRIGHT = 0.004;
const DARK_RATIO = 0.72;

export function titleActivityLikely(width: number, height: number, at: PixelAt, layout: AugmentCardLayout): boolean {
  const samples = titleActivityRegions(width, height, layout).map((box) =>
    measureTitleRegion(width, height, at, clampBox(box, width, height)),
  );
  const strong = samples.filter((sample) => sample.brightRatio >= ACTIVE_BRIGHT).length;
  const weak = samples.filter(
    (sample) => sample.brightRatio >= WEAK_BRIGHT && sample.darkRatio >= DARK_RATIO,
  ).length;
  return strong >= 2 || weak >= 2;
}

export function measureTitleRegion(
  width: number,
  height: number,
  at: PixelAt,
  box: PixelBox,
): { brightRatio: number; darkRatio: number } {
  let bright = 0;
  let dark = 0;
  let n = 0;
  const stepX = Math.max(1, Math.floor(box.width / 160));
  const stepY = Math.max(1, Math.floor(box.height / 50));
  for (let y = box.top; y < box.top + box.height; y += stepY) {
    for (let x = box.left; x < box.left + box.width; x += stepX) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const [r, g, b] = at(x, y);
      n += 1;
      if (r > 180 && g > 180 && b > 170) bright += 1;
      if (Math.max(r, g, b) < 55) dark += 1;
    }
  }
  return { brightRatio: n ? bright / n : 0, darkRatio: n ? dark / n : 0 };
}
