import { describe, expect, it } from "vitest";
import type { ChampionStat } from "../domain/champion";
import { championTiers } from "./champion-tiers";

function champ(partial: Partial<ChampionStat> & Pick<ChampionStat, "id" | "grade">): ChampionStat {
  return {
    key: "X",
    names: { ko: String(partial.id), en: "X" },
    title: "",
    iconUrl: null,
    pickRate: 0,
    winRate: null,
    ...partial,
  };
}

describe("championTiers", () => {
  it("groups by grade and keeps aramgg order inside each grade", () => {
    const groups = championTiers([
      champ({ id: 223, grade: "S", pickRate: 15.58 }),
      champ({ id: 17, grade: "S", pickRate: 15.71 }),
      champ({ id: 1, grade: "A", pickRate: 10 }),
    ]);

    expect(groups.map((group) => group.grade)).toEqual(["S", "A"]);
    expect(groups[0]?.champions.map((item) => item.id)).toEqual([223, 17]);
  });
});

