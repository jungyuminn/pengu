import { describe, expect, it } from "vitest";
import { gradeAdvice, gradeFromAramggTier, gradeFromPickRateRank, tierNumber } from "./grade";

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

describe("gradeAdvice", () => {
  it("explains each grade in one line", () => {
    expect(gradeAdvice("S")).toBe("성능과 인기가 모두 좋아요");
    expect(gradeAdvice("A")).toBe("안정적으로 자주 골라요");
    expect(gradeAdvice("B")).toBe("상황에 따라 선택해요");
    expect(gradeAdvice("C")).toBe("이 챔피언에겐 잘 맞지 않아요");
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
