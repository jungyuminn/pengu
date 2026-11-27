import { describe, expect, it } from "vitest";
import type { AugmentStat } from "./augment";
import type { ChampionStat } from "./champion";
import { homeMetaAugments, homeMetaChampions } from "./home-meta";

describe("homeMetaChampions", () => {
  it("puts S champions ahead of a popular C", () => {
    const ashe = champ(1, "애쉬", "C", 16, 45);
    const yasuo = champ(2, "야스오", "S", 8, 58);
    const teemo = champ(3, "티모", "S", 15, 54);
    expect(homeMetaChampions([ashe, yasuo, teemo]).map((row) => row.id)).toEqual([2, 3]);
  });

  it("fills remaining slots with A after S", () => {
    const s = champ(1, "티모", "S", 10, 54);
    const a = champ(2, "루시안", "A", 15, 52);
    const c = champ(3, "애쉬", "C", 20, 45);
    expect(homeMetaChampions([c, a, s]).map((row) => row.id)).toEqual([1, 2]);
  });
});

describe("homeMetaAugments", () => {
  it("keeps overall S augments and drops a high-pick C", () => {
    const bees = aug("bees", "벌이다!!!", "S", 55, 63);
    const cooker = aug("cooker", "압력솥", "C", 80, 41);
    const blade = aug("blade", "검을 뽑아라", "S", 16, 61);
    expect(homeMetaAugments([cooker, bees, blade]).map((row) => row.names.ko)).toEqual([
      "벌이다!!!",
      "검을 뽑아라",
    ]);
  });
});

function champ(id: number, name: string, grade: ChampionStat["grade"], pickRate: number, winRate: number): ChampionStat {
  return {
    id,
    key: name,
    names: { ko: name, en: name },
    title: "",
    iconUrl: null,
    grade,
    pickRate,
    winRate,
  };
}

function aug(id: string, name: string, grade: AugmentStat["grade"], pickRate: number, winRate: number): AugmentStat {
  return {
    id,
    numericId: 1,
    names: { ko: name, en: name },
    rarity: "gold",
    grade,
    pickRate,
    winRate,
    sample: null,
  };
}
