import { describe, expect, it } from "vitest";
import { originInBounds } from "./window-slide";

const window = { x: 200, y: 100, width: 1100, height: 680 };

describe("originInBounds", () => {
  it("pins the tray to the nearest window corner", () => {
    expect(originInBounds(window, { x: 1800, y: 1040, width: 24, height: 24 })).toEqual({
      x: 100,
      y: 100,
    });
  });

  it("uses the bottom edge when there is no tray origin", () => {
    expect(originInBounds(window, null)).toEqual({ x: 50, y: 100 });
  });
});
