export type AugmentSlotCount = 3 | 4;

export interface AugmentCardLayout {
  slotCount: AugmentSlotCount;
  cardWidthRatio: number;
  gapRatio: number;
  modern: boolean;
}

export interface PixelBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const LEGACY_THREE_CARD_LAYOUT: AugmentCardLayout = {
  slotCount: 3,
  cardWidthRatio: 0.168,
  gapRatio: 0.0175,
  modern: false,
};

export const FOUR_CARD_LAYOUT: AugmentCardLayout = {
  slotCount: 4,
  cardWidthRatio: 0.174,
  gapRatio: 0.026,
  modern: true,
};

export const COMPACT_FOUR_CARD_LAYOUT: AugmentCardLayout = {
  ...LEGACY_THREE_CARD_LAYOUT,
  slotCount: 4,
  modern: true,
};

export const THREE_CARD_LAYOUT: AugmentCardLayout = {
  ...FOUR_CARD_LAYOUT,
  slotCount: 3,
};

export const LAYOUT_CANDIDATES: AugmentCardLayout[] = [
  FOUR_CARD_LAYOUT,
  LEGACY_THREE_CARD_LAYOUT,
  THREE_CARD_LAYOUT,
  COMPACT_FOUR_CARD_LAYOUT,
];

export function getAugmentCardGeometry(width: number, layout: AugmentCardLayout) {
  const cardWidth = width * layout.cardWidthRatio;
  const cardGap = width * layout.gapRatio;
  const groupWidth = cardWidth * layout.slotCount + cardGap * (layout.slotCount - 1);
  const groupLeft = (width - groupWidth) / 2;
  return { cardWidth, cardGap, groupWidth, groupLeft };
}

export function paddleTitleRegions(width: number, height: number, layout: AugmentCardLayout): PixelBox[] {
  const { cardWidth, cardGap, groupLeft } = getAugmentCardGeometry(width, layout);
  return Array.from({ length: layout.slotCount }, (_, index) => ({
    left: groupLeft + index * (cardWidth + cardGap) + cardWidth * 0.02,
    top: height * (layout.modern ? 0.375 : 0.35),
    width: cardWidth * 0.96,
    height: height * (layout.modern ? 0.052 : 0.095),
  }));
}

export function titleActivityRegions(width: number, height: number, layout: AugmentCardLayout): PixelBox[] {
  const { cardWidth, cardGap, groupLeft } = getAugmentCardGeometry(width, layout);
  return Array.from({ length: layout.slotCount }, (_, index) => ({
    left: groupLeft + index * (cardWidth + cardGap) + cardWidth * 0.08,
    top: height * (layout.modern ? 0.38 : 0.37),
    width: cardWidth * 0.84,
    height: height * (layout.modern ? 0.05 : 0.07),
  }));
}

export function rerollButtonRegions(width: number, height: number, layout: AugmentCardLayout): PixelBox[] {
  const { cardWidth, cardGap, groupLeft } = getAugmentCardGeometry(width, layout);
  return Array.from({ length: layout.slotCount }, (_, index) => ({
    left: groupLeft + index * (cardWidth + cardGap) + cardWidth * (layout.modern ? 0.37 : 0.56),
    top: height * (layout.modern ? 0.695 : 0.63),
    width: cardWidth * (layout.modern ? 0.29 : 0.34),
    height: height * (layout.modern ? 0.05 : 0.045),
  }));
}

export function clampBox(box: PixelBox, width: number, height: number): PixelBox {
  const left = Math.max(0, Math.min(width - 1, Math.round(box.left)));
  const top = Math.max(0, Math.min(height - 1, Math.round(box.top)));
  const right = Math.max(left + 1, Math.min(width, Math.round(box.left + box.width)));
  const bottom = Math.max(top + 1, Math.min(height, Math.round(box.top + box.height)));
  return { left, top, width: right - left, height: bottom - top };
}
