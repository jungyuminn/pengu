import { describe, expect, it } from "vitest";
import type { AugmentStat } from "./augment";
import { augmentCatalogPlace, augmentChampionPlace } from "./augment-place";
import type { ChampionAugmentRow } from "./champion-detail";

const bees: AugmentStat = {
  id: "bees",
  numericId: 1001,
  names: { ko: "벌이다!!!", en: "BEES!!!" },
  rarity: "gold",
  grade: "S",
  pickRate: 49,
  winRate: 40,
  sample: null,
};

const eureka: AugmentStat = {
  id: "eureka",
  numericId: 1002,
  names: { ko: "유레카", en: "Eureka" },
  rarity: "prismatic",
  grade: "A",
  pickRate: 40,
  winRate: 60,
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

describe("augmentCatalogPlace", () => {
  it("keeps S above A even when the A has a higher win rate", () => {
    expect(augmentCatalogPlace([bees, eureka], "bees")).toEqual({ rank: 1, total: 2 });
    expect(augmentCatalogPlace([bees, eureka], "eureka")).toEqual({ rank: 2, total: 2 });
  });

  it("returns nothing when the augment is not in the catalog", () => {
    expect(augmentCatalogPlace([bees], "missing")).toBeNull();
  });
});

describe("augmentChampionPlace", () => {
  it("ranks the playing champion's augments by grade, then win rate", () => {
    expect(
      augmentChampionPlace(
        [row({ winRate: 42 }), row({ id: 1002, name: "유레카", grade: "S", winRate: 53 })],
        bees,
      ),
    ).toEqual({ rank: 2, total: 2 });
  });

  it("does not put an S behind an A", () => {
    expect(
      augmentChampionPlace(
        [
          row({ id: 1002, name: "유레카", grade: "A", winRate: 60 }),
          row({ grade: "S", winRate: 40 }),
        ],
        bees,
      ),
    ).toEqual({ rank: 1, total: 2 });
  });

  it("returns nothing when the champion has no row for the augment", () => {
    expect(augmentChampionPlace([row({ id: 9, name: "유레카" })], bees)).toBeNull();
  });
});
