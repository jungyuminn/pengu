import { describe, expect, it } from "vitest";
import { averageKda, formatKda, kdaRatio, kdaTone } from "./kda";

describe("kdaRatio", () => {
  it("is (kills + assists) / deaths", () => {
    expect(kdaRatio(8, 2, 11)).toBe(9.5);
    expect(kdaRatio(1, 7, 3)).toBeCloseTo(4 / 7);
  });

  it("is Perfect when there are no deaths", () => {
    expect(kdaRatio(3, 0, 2)).toBe(Number.POSITIVE_INFINITY);
    expect(formatKda(3, 0, 2)).toBe("Perfect");
  });

  it("is 0 when the scoreboard is empty", () => {
    expect(kdaRatio(0, 0, 0)).toBe(0);
    expect(formatKda(0, 0, 0)).toBe("0.00");
  });
});

describe("kdaTone", () => {
  it("splits gray, white and accent bands", () => {
    expect(kdaTone(0)).toBe("low");
    expect(kdaTone(1.99)).toBe("low");
    expect(kdaTone(2)).toBe("ok");
    expect(kdaTone(3.99)).toBe("ok");
    expect(kdaTone(4)).toBe("high");
    expect(kdaTone("Perfect")).toBe("high");
  });
});

describe("averageKda", () => {
  it("uses totals, not the mean of per-game ratios", () => {
    expect(
      averageKda([
        { kills: 8, deaths: 2, assists: 11 },
        { kills: 1, deaths: 7, assists: 3 },
      ]),
    ).toBe("2.56");
  });

  it("is null with no games", () => {
    expect(averageKda([])).toBeNull();
  });
});
