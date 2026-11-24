import { describe, expect, it } from "vitest";
import { detectAugmentCardLayout, hasVisibleAugmentCardFrames } from "./augment-card-frame";
import { FOUR_CARD_LAYOUT, THREE_CARD_LAYOUT, getAugmentCardGeometry } from "./augment-layout";
import { titleActivityLikely } from "./title-activity";

describe("detectAugmentCardLayout", () => {
  it("does not treat an empty fight board as cards", () => {
    const board = paint(320, 180, [18, 24, 28]);
    expect(detectAugmentCardLayout(board.width, board.height, board.at)).toBeNull();
    expect(hasVisibleAugmentCardFrames(board.width, board.height, board.at, THREE_CARD_LAYOUT)).toBe(false);
    expect(hasVisibleAugmentCardFrames(board.width, board.height, board.at, FOUR_CARD_LAYOUT)).toBe(false);
  });

  it("does not treat a title-less dark board as an offer", () => {
    const board = paint(320, 180, [18, 24, 28]);
    expect(titleActivityLikely(board.width, board.height, board.at, THREE_CARD_LAYOUT)).toBe(false);
  });

  it("keeps four-card geometry wider than three-card geometry", () => {
    const four = getAugmentCardGeometry(1280, FOUR_CARD_LAYOUT);
    const three = getAugmentCardGeometry(1280, THREE_CARD_LAYOUT);
    expect(four.groupWidth).toBeGreaterThan(three.groupWidth);
  });
});

function paint(width: number, height: number, rgb: [number, number, number]) {
  const pixels: Array<Array<[number, number, number]>> = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => rgb),
  );
  return {
    width,
    height,
    at: (x: number, y: number): [number, number, number] => pixels[y]?.[x] ?? [0, 0, 0],
  };
}
