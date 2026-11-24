import { describe, expect, it } from "vitest";
import { gradeFromAramggTier, gradeFromPickRateRank, tierNumber } from "./grade";

describe("gradeFromAramggTier", () => {
  it("maps numeric tiers to S-C", () => {
    expect(gradeFromAramggTier(1)).toBe("S");
    expect(gradeFromAramggTier(2)).toBe("A");
    expect(gradeFromAramggTier(3)).toBe("B");
    expect(gradeFromAramggTier(4)).toBe("C");
  });

  it("maps letter labels", () => {
    expect(gradeFromAramggTier("S+")).toBe("S");
    expect(gradeFromAramggTier("T3")).toBe("B");
  });
});

describe("tierNumber", () => {
  it("maps S-C to 1-4", () => {
    expect(tierNumber("S")).toBe(1);
    expect(tierNumber("A")).toBe(2);
    expect(tierNumber("B")).toBe(3);
    expect(tierNumber("C")).toBe(4);
  });
});

describe("gradeFromPickRateRank", () => {
  it("puts the most picked augments in S", () => {
    expect(gradeFromPickRateRank(1, 200)).toBe("S");
    expect(gradeFromPickRateRank(40, 200)).toBe("A");
    expect(gradeFromPickRateRank(90, 200)).toBe("B");
    expect(gradeFromPickRateRank(180, 200)).toBe("C");
  });
});
