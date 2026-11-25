import { describe, expect, it } from "vitest";
import { withChampionAugmentGrade } from "./champion-augment-grade";
import type { AugmentStat } from "./augment";
import type { ChampionAugmentRow } from "./champion-detail";

const bees: AugmentStat = {
  id: "bees",
  numericId: 1001,
  names: { ko: "벌이다!!!", en: "BEES!!!" },
  rarity: "gold",
  grade: "S",
  pickRate: 49,
  sample: null,
};

function row(partial: Partial<ChampionAugmentRow>): ChampionAugmentRow {
  return {
    id: 1001,
    name: "벌이다!!!",
    grade: "C",
    rarity: "gold",
    pickRate: 10,
    winRate: 40,
    iconUrl: null,
    ...partial,
  };
}

describe("withChampionAugmentGrade", () => {
  it("replaces the global grade with the champion's aramgg grade", () => {
    expect(withChampionAugmentGrade(bees, [row({ grade: "C" })]).grade).toBe("C");
  });

  it("matches by name when the numeric id is missing", () => {
    const unnamed = { ...bees, numericId: null };
    expect(withChampionAugmentGrade(unnamed, [row({ id: 9, name: "벌이다!!!", grade: "B" })]).grade).toBe(
      "B",
    );
  });

  it("keeps the catalog grade when the champion has no row", () => {
    expect(withChampionAugmentGrade(bees, [row({ id: 2, name: "유레카", grade: "A" })]).grade).toBe("S");
  });
});
