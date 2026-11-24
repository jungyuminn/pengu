import {
  LAYOUT_CANDIDATES,
  getAugmentCardGeometry,
  type AugmentCardLayout,
} from "./augment-layout";
import type { PixelAt } from "./offer-frame";

export function detectAugmentCardLayout(
  width: number,
  height: number,
  at: PixelAt,
  preferred: AugmentCardLayout | null = null,
): AugmentCardLayout | null {
  if (preferred && hasVisibleAugmentCardFrames(width, height, at, preferred)) return preferred;
  for (const layout of LAYOUT_CANDIDATES) {
    if (layout === preferred) continue;
    if (hasVisibleAugmentCardFrames(width, height, at, layout)) return layout;
  }
  return null;
}

export function hasVisibleAugmentCardFrames(
  width: number,
  height: number,
  at: PixelAt,
  layout: AugmentCardLayout,
): boolean {
  if (width < 48 || height < 32) return false;
  const { cardWidth, cardGap, groupLeft } = getAugmentCardGeometry(width, layout);
  const minRgb = layout.modern ? ([110, 95, 75] as const) : ([130, 110, 80] as const);
  let visible = 0;
  for (let slot = 0; slot < layout.slotCount; slot += 1) {
    if (hasCardAt(groupLeft + slot * (cardWidth + cardGap), width, height, at, cardWidth, minRgb)) {
      visible += 1;
    }
    if (visible === 3) return true;
    if (visible + layout.slotCount - slot - 1 < 3) return false;
  }
  return false;
}

function hasCardAt(
  left: number,
  width: number,
  height: number,
  at: PixelAt,
  cardWidth: number,
  minRgb: readonly [number, number, number],
): boolean {
  let topCoverage = 0;
  for (let row = 0; row < 32; row += 1) {
    let hits = 0;
    for (let col = 0; col < 48; col += 1) {
      if (
        isBorder(
          left + cardWidth * (0.15 + (col / 47) * 0.7),
          height * (0.14 + (row / 31) * 0.09),
          width,
          height,
          at,
          minRgb,
        )
      ) {
        hits += 1;
      }
    }
    topCoverage = Math.max(topCoverage, hits / 48);
  }
  if (topCoverage < 0.8) return false;

  for (const edge of [0, 0.91]) {
    let edgeCoverage = 0;
    for (let col = 0; col < 16; col += 1) {
      let hits = 0;
      for (let row = 0; row < 32; row += 1) {
        if (
          isBorder(
            left + cardWidth * (edge + (col / 15) * 0.09),
            height * (0.24 + (row / 31) * 0.11),
            width,
            height,
            at,
            minRgb,
          )
        ) {
          hits += 1;
        }
      }
      edgeCoverage = Math.max(edgeCoverage, hits / 32);
    }
    if (edgeCoverage < 0.8) return false;
  }

  let darkInterior = 0;
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const [r, g, b] = sample(
        left + cardWidth * (0.2 + (col / 7) * 0.6),
        height * (0.5 + (row / 7) * 0.1),
        width,
        height,
        at,
      );
      if (Math.max(r, g, b) < 85) darkInterior += 1;
    }
  }
  return darkInterior / 64 >= 0.5;
}

function isBorder(
  x: number,
  y: number,
  width: number,
  height: number,
  at: PixelAt,
  minRgb: readonly [number, number, number],
): boolean {
  const [r, g, b] = sample(x, y, width, height, at);
  return r >= minRgb[0] && g >= minRgb[1] && b >= minRgb[2] && Math.max(r, g, b) - Math.min(r, g, b) <= 120;
}

function sample(
  x: number,
  y: number,
  width: number,
  height: number,
  at: PixelAt,
): readonly [number, number, number] {
  return at(
    Math.min(width - 1, Math.max(0, Math.round(x))),
    Math.min(height - 1, Math.max(0, Math.round(y))),
  );
}
