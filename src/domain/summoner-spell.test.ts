import { describe, expect, it } from "vitest";
import { orderSummonerSpells } from "./summoner-spell";

describe("orderSummonerSpells", () => {
  it("puts flash in the second slot", () => {
    expect(orderSummonerSpells([spell(4, "점멸"), spell(32, "표식")]).map((item) => item.name)).toEqual([
      "표식",
      "점멸",
    ]);
    expect(orderSummonerSpells([spell(32, "표식"), spell(4, "점멸")]).map((item) => item.name)).toEqual([
      "표식",
      "점멸",
    ]);
    expect(orderSummonerSpells([spell(null, "闪现"), spell(null, "雪球")]).map((item) => item.name)).toEqual([
      "雪球",
      "闪现",
    ]);
  });

  it("leaves pairs without flash alone", () => {
    expect(orderSummonerSpells([spell(6, "유체화"), spell(32, "표식")]).map((item) => item.name)).toEqual([
      "유체화",
      "표식",
    ]);
  });
});

function spell(id: number | null, name: string) {
  return { id, name, iconUrl: null };
}
