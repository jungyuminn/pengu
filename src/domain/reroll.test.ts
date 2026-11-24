import { describe, expect, it } from "vitest";
import { THREE_CARD_LAYOUT, clampBox, rerollButtonRegions } from "./augment-layout";
import { isRerollGold, isRerollIdle, rerollButtonsVisible } from "./reroll";

describe("rerollButtonsVisible", () => {
  it("needs at least two gold-like buttons", () => {
    expect(isRerollGold(220, 160, 50)).toBe(true);
    expect(isRerollGold(40, 80, 200)).toBe(false);
    expect(isRerollIdle(110, 108, 112)).toBe(true);
    const board = paint(320, 180, [18, 24, 28]);
    for (const region of rerollButtonRegions(board.width, board.height, THREE_CARD_LAYOUT).slice(0, 2)) {
      const box = clampBox(region, board.width, board.height);
      board.bar(box.left, box.left + box.width - 1, box.top, box.top + box.height - 1, [220, 160, 52]);
    }
    expect(rerollButtonsVisible(board.width, board.height, board.at, THREE_CARD_LAYOUT)).toBe(true);
  });

  it("ignores a fight HUD patch", () => {
    const hud = paint(320, 180, [18, 24, 28]);
    expect(rerollButtonsVisible(hud.width, hud.height, hud.at, THREE_CARD_LAYOUT)).toBe(false);
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
    bar(x0: number, x1: number, y0: number, y1: number, color: [number, number, number]) {
      for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
          if (pixels[y]?.[x]) pixels[y][x] = color;
        }
      }
    },
  };
}
