import { describe, expect, it } from "vitest";
import type { AugmentStat } from "./augment";
import { augmentsInText, isLikelyTitleSlotText, matchAugment } from "./match-name";

const bees: AugmentStat = {
  id: "bees",
  numericId: null,
  names: { ko: "벌이다!!!", en: "BEES!!!" },
  rarity: "gold",
  grade: "S",
  pickRate: 49,
  sample: null,
};

const eureka: AugmentStat = {
  id: "eureka",
  numericId: null,
  names: { ko: "유레카", en: "Eureka" },
  rarity: "prismatic",
  grade: "A",
  pickRate: 40,
  sample: null,
};

describe("matchAugment", () => {
  it("matches Korean names with punctuation noise", () => {
    expect(matchAugment("벌이다!!", [bees])?.id).toBe("bees");
  });

  it("matches English names ignoring case", () => {
    expect(matchAugment("bees", [bees])?.id).toBe("bees");
  });

  it("matches a short Korean title from a single card line", () => {
    const blade: AugmentStat = { ...eureka, id: "blade", names: { ko: "검무", en: "Blade Waltz" } };
    expect(matchAugment("검무", [blade, bees])?.id).toBe("blade");
  });

  it("does not fuzzy-match a two-letter name from a different character", () => {
    const bang: AugmentStat = { ...eureka, id: "bang", names: { ko: "꽁!", en: "Splat" } };
    expect(matchAugment("공", [bang])).toBeNull();
    expect(matchAugment("꽁!", [bang])?.id).toBe("bang");
  });

  it("rejects a slot that is much longer than the matched name", () => {
    expect(isLikelyTitleSlotText("유레카", "유레카")).toBe(true);
    expect(isLikelyTitleSlotText("유레카를 고르면 스킬가속이 크게 증가합니다", "유레카")).toBe(false);
  });

  it("does not treat a description sentence as the augment name", () => {
    const potion: AugmentStat = {
      ...eureka,
      id: "potion",
      names: { ko: "부유약", en: "Potion of Madre" },
    };
    expect(matchAugment("부유약을 얻습니다", [potion])).toBeNull();
  });

  it("matches a three-letter Korean title with one OCR typo", () => {
    const cooker: AugmentStat = {
      ...eureka,
      id: "cooker",
      names: { ko: "압력솥", en: "Pressure Cooker" },
    };
    expect(matchAugment("압력속", [cooker, bees])?.id).toBe("cooker");
  });

  it("matches a longer Korean title with one OCR typo", () => {
    const overextend: AugmentStat = {
      ...eureka,
      id: "over",
      names: { ko: "무리한 진입", en: "Overextender" },
    };
    expect(matchAugment("무리환 진입", [overextend, bees])?.id).toBe("over");
  });
});

describe("augmentsInText", () => {
  it("keeps left-to-right order from one OCR strip", () => {
    expect(augmentsInText("유레카 벌이다!!!", [bees, eureka]).map((row) => row.id)).toEqual([
      "eureka",
      "bees",
    ]);
  });

  it("keeps more than three names from one strip", () => {
    const tank: AugmentStat = { ...eureka, id: "tank", names: { ko: "탱크 엔진", en: "Tank Engine" } };
    const wind: AugmentStat = { ...eureka, id: "wind", names: { ko: "질풍참", en: "Wind Strike" } };
    expect(
      augmentsInText("유레카 벌이다!!! 탱크 엔진 질풍참", [bees, eureka, tank, wind]).map((row) => row.id),
    ).toEqual(["eureka", "bees", "tank", "wind"]);
  });

  it("finds an augment name inside HUD noise", () => {
    const overextend: AugmentStat = {
      ...eureka,
      id: "over",
      names: { ko: "무리한 진입", en: "Overextender" },
    };
    expect(
      augmentsInText("생피언 드 러 페 포 보조 피 하 량 무리한 진입 사그 조 주", [overextend]).map(
        (row) => row.id,
      ),
    ).toEqual(["over"]);
  });
});
