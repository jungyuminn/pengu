import { describe, expect, it } from "vitest";
import type { ChampionDetail } from "../domain/champion-detail";
import { mergeItemNames } from "./merge-item-names";

describe("mergeItemNames", () => {
  it("replaces Chinese item and summoner names with Korean", () => {
    const merged = mergeItemNames(detail(), {
      itemById: new Map([[3084, "강철심장"]]),
      itemByName: new Map([["心之钢", "강철심장"], ["治疗宝珠", "원기 회복의 구슬"]]),
      itemTextById: new Map([[3084, "체력을 얻고 주변 적에게 피해를 줍니다."]]),
      spellById: new Map([[4, "점멸"]]),
      spellByName: new Map([["闪现", "점멸"]]),
    });
    expect(merged.coreItems[0]?.name).toBe("강철심장");
    expect(merged.coreItems[0]?.description).toBe("체력을 얻고 주변 적에게 피해를 줍니다.");
    expect(merged.startingItems[0]?.name).toBe("원기 회복의 구슬");
    expect(merged.summoners[0]?.name).toBe("점멸");
  });

  it("drops boots from core items", () => {
    const merged = mergeItemNames(
      {
        ...detail(),
        coreItems: [
          { id: 3078, name: "삼위일체", iconUrl: null },
          { id: 3158, name: "Ionian Boots of Lucidity", iconUrl: null },
          { id: 3004, name: "마나무네", iconUrl: null },
        ],
      },
      {
        itemById: new Map([[3158, "명석함의 아이오니아 장화"]]),
        itemByName: new Map(),
        itemTextById: new Map(),
        spellById: new Map(),
        spellByName: new Map(),
      },
    );
    expect(merged.coreItems.map((item) => item.name)).toEqual(["삼위일체", "마나무네"]);
  });

  it("puts flash in the second summoner slot", () => {
    const merged = mergeItemNames(
      { ...detail(), summoners: [{ name: "闪现", iconUrl: null }, { name: "雪球", iconUrl: null }] },
      {
        itemById: new Map(),
        itemByName: new Map(),
        itemTextById: new Map(),
        spellById: new Map(),
        spellByName: new Map([
          ["闪现", "점멸"],
          ["雪球", "표식"],
        ]),
      },
    );
    expect(merged.summoners.map((item) => item.name)).toEqual(["표식", "점멸"]);
  });
});

function detail(): ChampionDetail {
  return {
    id: 223,
    name: "탐 켄치",
    title: "",
    key: "TahmKench",
    iconUrl: null,
    roles: [],
    grade: "S",
    pickRate: 1,
    winRate: 50,
    patch: "16.23",
    augments: [],
    coreItems: [{ id: 3084, name: "心之钢", iconUrl: null }],
    startingItems: [{ name: "治疗宝珠", iconUrl: null }],
    summoners: [{ name: "闪现", iconUrl: null }],
    skillOrder: "",
    trios: [],
  };
}
