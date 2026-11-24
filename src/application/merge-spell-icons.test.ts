import { describe, expect, it } from "vitest";
import type { ChampionDetail } from "../domain/champion-detail";
import { mergeSpellIcons } from "./merge-spell-icons";

describe("mergeSpellIcons", () => {
  it("attaches bundled urls by id and name", () => {
    const merged = mergeSpellIcons(
      sample(),
      new Map([
        ["4", "../../../assets/spells/flash.png"],
        ["표식", "../../../assets/spells/mark.png"],
      ]),
    );
    expect(merged.summoners[0]?.iconUrl).toBe("../../../assets/spells/flash.png");
    expect(merged.summoners[1]?.iconUrl).toBe("../../../assets/spells/mark.png");
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
    coreItems: [],
    startingItems: [],
    summoners: [
      { id: 4, name: "점멸", iconUrl: "https://cdn.dtodo.cn/flash.png" },
      { name: "표식", iconUrl: null },
    ],
    skillOrder: "",
    trios: [],
  };
}
