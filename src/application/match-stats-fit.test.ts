import { describe, expect, it } from "vitest";
import type { ChampionDetail } from "../domain/champion-detail";
import { matchStatsFit } from "./match-stats-fit";

describe("matchStatsFit", () => {
  it("scores a player against that champion's S/A augments and core items", () => {
    const fits = matchStatsFit(
      [{ key: "0", championId: 81, itemIds: [3006, 3040], augmentIds: [1, 2] }],
      new Map([[81, detail()]]),
    );
    expect(fits["0"]?.augmentHits).toBe(1);
    expect(fits["0"]?.itemHits).toBe(1);
    expect(fits["0"]?.gradeCounts.S).toBe(1);
    expect(fits["0"]?.percent).toBe(68);
    expect(fits["0"]?.ignoreItemIds).toEqual([3006]);
    expect(fits["0"]?.matchedItemIds).toEqual([3040]);
  });
});

function detail(): ChampionDetail {
  return {
    id: 81,
    name: "이즈",
    title: "",
    key: "Ezreal",
    iconUrl: null,
    roles: [],
    grade: "S",
    pickRate: 10,
    winRate: 50,
    patch: "1",
    augments: [
      { id: 1, name: "은1", grade: "S", rarity: "silver", pickRate: 8, winRate: 52, iconUrl: null },
      { id: 9, name: "은9", grade: "C", rarity: "silver", pickRate: 1, winRate: 40, iconUrl: null },
    ],
    coreItems: [{ id: 3040, name: "대천사", iconUrl: null }],
    startingItems: [],
    summoners: [],
    skillOrder: "QWE",
    trios: [],
  };
}
