import { describe, expect, it } from "vitest";
import type { ChampionDetail } from "../domain/champion-detail";
import { mergeItemIcons } from "./merge-item-icons";

describe("mergeItemIcons", () => {
  it("attaches bundled urls by id and name", () => {
    const merged = mergeItemIcons(
      sample(),
      new Map([
        ["3084", "../../../assets/items/heartsteel.png"],
        ["원기 회복의 구슬", "../../../assets/items/rejuvenationbead.png"],
      ]),
    );
    expect(merged.coreItems[0]?.iconUrl).toBe("../../../assets/items/heartsteel.png");
    expect(merged.startingItems[0]?.iconUrl).toBe("../../../assets/items/rejuvenationbead.png");
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
    augments: [],
    coreItems: [{ id: 3084, name: "강철심장", iconUrl: "https://cdn.dtodo.cn/3084.png" }],
    startingItems: [{ name: "원기 회복의 구슬", iconUrl: null }],
    summoners: [],
    skillOrder: "",
    trios: [],
  };
}
