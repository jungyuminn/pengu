import { describe, expect, it } from "vitest";
import type { ChampionDetail } from "../domain/champion-detail";
import { mergeSkillIcons } from "./merge-skill-icons";

describe("mergeSkillIcons", () => {
  it("attaches QWE urls from the index", () => {
    const merged = mergeSkillIcons(
      sample({ skillOrder: "E > Q > W" }),
      new Map([
        ["Q", "https://cd/q.png"],
        ["W", "https://cd/w.png"],
        ["E", "https://cd/e.png"],
      ]),
    );
    expect(merged.skills).toEqual([
      { key: "E", name: "E", iconUrl: "https://cd/e.png" },
      { key: "Q", name: "Q", iconUrl: "https://cd/q.png" },
      { key: "W", name: "W", iconUrl: "https://cd/w.png" },
    ]);
  });
});

function sample(partial: Partial<ChampionDetail> = {}): ChampionDetail {
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
    summoners: [],
    skillOrder: "",
    trios: [],
    ...partial,
  };
}
