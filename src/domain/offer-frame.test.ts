import { describe, expect, it } from "vitest";
import {
  countOfferFrames,
  isOfferFill,
  isOfferMetal,
  offerCardsVisible,
  offerSlotLooksLike,
  slotLooksLikeOffer,
} from "./offer-frame";

describe("offer-frame", () => {
  it("treats gold, silver and prismatic borders as card metal", () => {
    expect(isOfferMetal(198, 162, 72)).toBe(true);
    expect(isOfferMetal(188, 190, 196)).toBe(true);
    expect(isOfferMetal(210, 214, 220)).toBe(true);
    expect(isOfferMetal(150, 154, 158)).toBe(true);
    expect(isOfferMetal(80, 210, 255)).toBe(true);
    expect(isOfferMetal(30, 80, 200)).toBe(false);
    expect(isOfferMetal(20, 24, 30)).toBe(false);
  });

  it("treats the dark teal card body as fill", () => {
    expect(isOfferFill(12, 16, 18)).toBe(true);
    expect(isOfferFill(28, 36, 40)).toBe(true);
    expect(isOfferFill(180, 170, 80)).toBe(false);
  });

  it("needs a metallic edge and a dark body to count as a card", () => {
    expect(slotLooksLikeOffer(0.18, 0.62)).toBe(true);
    expect(slotLooksLikeOffer(0.02, 0.8)).toBe(false);
    expect(offerCardsVisible(2)).toBe(false);
    expect(offerCardsVisible(3)).toBe(true);
    expect(offerCardsVisible(4)).toBe(true);
    expect(offerCardsVisible(5)).toBe(false);
  });

  it("counts three silver card tops on a dark board", () => {
    const board = paintBoard(320, 120);
    board.bar(40, 100, 4, 16, [210, 214, 220]);
    board.bar(128, 188, 4, 16, [188, 190, 196]);
    board.bar(216, 276, 4, 16, [150, 154, 158]);
    expect(countOfferFrames(board.width, board.height, board.at)).toBe(3);
  });

  it("counts four mixed-rarity card tops", () => {
    const board = paintBoard(400, 120);
    board.bar(24, 88, 4, 16, [188, 190, 196]);
    board.bar(112, 176, 4, 16, [198, 162, 72]);
    board.bar(200, 264, 4, 16, [80, 210, 255]);
    board.bar(288, 352, 4, 16, [210, 214, 220]);
    expect(countOfferFrames(board.width, board.height, board.at)).toBe(4);
  });

  it("ignores a fight screen with no card frames", () => {
    const board = paintBoard(320, 120);
    expect(countOfferFrames(board.width, board.height, board.at)).toBe(0);
  });

  it("ignores a gray HUD slab that is not three cards", () => {
    const board = paintBoard(320, 200);
    board.bar(20, 300, 8, 40, [120, 122, 126]);
    expect(countOfferFrames(board.width, board.height, board.at)).toBe(0);
  });

  it("accepts a dark card with a metal top and rejects a fight patch", () => {
    const card = paintBoard(80, 160);
    card.bar(4, 76, 8, 28, [210, 214, 220]);
    expect(offerSlotLooksLike(card.width, card.height, card.at)).toBe(true);
    const hud = paintBoard(80, 160);
    hud.bar(0, 79, 0, 159, [30, 80, 40]);
    expect(offerSlotLooksLike(hud.width, hud.height, hud.at)).toBe(false);
  });
});

function paintBoard(width: number, height: number) {
  const pixels: Array<Array<[number, number, number]>> = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => [18, 24, 28] as [number, number, number]),
  );
  return {
    width,
    height,
    at: (x: number, y: number): [number, number, number] => pixels[y]?.[x] ?? [0, 0, 0],
    bar(x0: number, x1: number, y0: number, y1: number, rgb: [number, number, number]) {
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
          if (pixels[y]?.[x]) pixels[y][x] = rgb;
        }
      }
    },
  };
}
