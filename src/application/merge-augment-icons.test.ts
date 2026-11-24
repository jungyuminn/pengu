import { describe, expect, it } from "vitest";
import type { ChampionDetail } from "../domain/champion-detail";
import { mergeAugmentIcons } from "./merge-augment-icons";

describe("mergeAugmentIcons", () => {
  it("replaces dtodo urls with indexed community dragon urls", () => {
    const detail = mergeAugmentIcons(sample(), new Map([[3265, "https://cd/fortified.png"]]));
    expect(detail.augments[0]?.iconUrl).toBe("https://cd/fortified.png");
    expect(detail.augments[1]?.iconUrl).toBe("https://cdn.dtodo.cn/hextech/augment-icons/heavyhitter_large.png");
  });

  it("attaches bundled icons to trio augments by id", () => {
    const detail = mergeAugmentIcons(
      {
        ...sample(),
        trios: [
          {
            ids: [3265, 1181],
            names: ["요새화", "강타자"],
            icons: [],
            winRate: 60,
          },
        ],
      },
      new Map([
        [3265, "../../../assets/augments/fortified.png"],
        [1181, "../../../assets/augments/heavyhitter.png"],
      ]),
    );
    expect(detail.trios[0]?.icons.map((item) => item.iconUrl)).toEqual([
      "../../../assets/augments/fortified.png",
      "../../../assets/augments/heavyhitter.png",
    ]);
  });
});

function sample(): ChampionDetail {
  return {
    id: 223,
    name: "탐 켄치",
    title: "",
    key: "TahmKench",
    iconUrl: null,
    roles: [],
    grade: "S",
    pickRate: null,
    winRate: null,
    patch: "16.23",
    augments: [
      {
        id: 3265,
        name: "요새화",
        grade: "S",
        rarity: "silver",
        pickRate: 1,
        winRate: 1,
        iconUrl: "https://cdn.dtodo.cn/hextech/augment-icons/fortified_large.png",
      },
      {
        id: 1181,
        name: "강타자",
        grade: "S",
        rarity: "silver",
        pickRate: 1,
        winRate: 1,
        iconUrl: "https://cdn.dtodo.cn/hextech/augment-icons/heavyhitter_large.png",
      },
    ],
    coreItems: [],
    startingItems: [],
    summoners: [],
    skillOrder: "",
    trios: [],
  };
}
