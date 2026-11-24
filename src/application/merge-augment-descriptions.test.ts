import { describe, expect, it } from "vitest";
import type { ChampionDetail } from "../domain/champion-detail";
import { mergeAugmentDescriptions } from "./merge-augment-descriptions";

describe("mergeAugmentDescriptions", () => {
  it("attaches korean descriptions by augment id", () => {
    const merged = mergeAugmentDescriptions(sample(), new Map([[1004, "궁극기를 사용할 수 없습니다."]]));
    expect(merged.augments[0]?.description).toBe("궁극기를 사용할 수 없습니다.");
    expect(merged.trios[0]?.icons[0]?.description).toBe("궁극기를 사용할 수 없습니다.");
  });
});

function sample(): ChampionDetail {
  return {
    id: 81,
    name: "이즈리얼",
    title: "",
    key: "Ezreal",
    iconUrl: null,
    roles: [],
    grade: "B",
    pickRate: null,
    winRate: null,
    patch: "16.23",
    augments: [
      {
        id: 1004,
        name: "기본으로 돌아가기",
        grade: "S",
        rarity: "prismatic",
        pickRate: 1,
        winRate: 1,
        iconUrl: null,
      },
    ],
    coreItems: [],
    startingItems: [],
    summoners: [],
    skillOrder: "",
    trios: [
      {
        ids: [1004],
        names: ["기본으로 돌아가기"],
        icons: [{ id: 1004, name: "기본으로 돌아가기", iconUrl: null }],
        winRate: 50,
      },
    ],
  };
}
