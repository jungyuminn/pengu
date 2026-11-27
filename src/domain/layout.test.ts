import { describe, expect, it } from "vitest";
import { CARD_OVERLAY, OFFER_CAPTURE_BANDS } from "./layout";
import {
  FOUR_CARD_LAYOUT,
  LEGACY_THREE_CARD_LAYOUT,
  THREE_CARD_LAYOUT,
  getAugmentCardGeometry,
  paddleTitleRegions,
} from "./augment-layout";

describe("augment card layout", () => {
  it("uses a wider group for four cards than three", () => {
    expect(getAugmentCardGeometry(1920, FOUR_CARD_LAYOUT).groupWidth).toBeGreaterThan(
      getAugmentCardGeometry(1920, THREE_CARD_LAYOUT).groupWidth,
    );
  });

  it("builds one title crop per slot", () => {
    expect(paddleTitleRegions(1920, 1080, THREE_CARD_LAYOUT)).toHaveLength(3);
    expect(paddleTitleRegions(1920, 1080, FOUR_CARD_LAYOUT)).toHaveLength(4);
  });

  it("keeps the grade overlay on top of the card frames", () => {
    for (const layout of [THREE_CARD_LAYOUT, FOUR_CARD_LAYOUT, LEGACY_THREE_CARD_LAYOUT]) {
      const titleTop = Math.min(...paddleTitleRegions(1920, 1080, layout).map((box) => box.top / 1080));
      expect(CARD_OVERLAY.y + CARD_OVERLAY.height).toBeLessThan(titleTop);
    }
    expect(CARD_OVERLAY.y).toBeLessThan(0.16);
  });

  it("captures the title row and the reroll row", () => {
    const covers = (y: number) =>
      OFFER_CAPTURE_BANDS.some((band) => y >= band.y && y <= band.y + band.height);
    expect(covers(0.4)).toBe(true);
    expect(covers(0.7)).toBe(true);
    expect(covers(0.05)).toBe(false);
  });
});
