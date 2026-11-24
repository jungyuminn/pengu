import { describe, expect, it } from "vitest";
import type { StatsSnapshot } from "../domain/augment";
import type { ChampionDetail } from "../domain/champion-detail";
import { mergeChampionIcons, mergeDetailPortrait } from "./merge-champion-icons";

const portraits = {
  url: (key: string) => (key ? `../../../assets/champions/${key.toLowerCase()}.png` : null),
};

describe("mergeChampionIcons", () => {
  it("replaces remote portraits with bundled urls", () => {
    const merged = mergeChampionIcons(snapshot(), portraits);
    expect(merged.champions[0]?.iconUrl).toBe("../../../assets/champions/tahmkench.png");
  });
});

describe("mergeDetailPortrait", () => {
  it("sets the bundled portrait on a detail row", () => {
    const merged = mergeDetailPortrait(detail(), portraits);
    expect(merged.iconUrl).toBe("../../../assets/champions/tahmkench.png");
  });
});

function snapshot(): StatsSnapshot {
  return {
    patch: "16.23",
    source: "aramgg",
    syncedAt: "2026-11-24T00:00:00.000Z",
    attribution: "test",
    augments: [],
    champions: [
      {
        id: 223,
        key: "TahmKench",
        names: { ko: "탐 켄치", en: "TahmKench" },
        title: "",
        iconUrl: "https://cdn.communitydragon.org/latest/champion/223/square",
        grade: "S",
        pickRate: 15,
        winRate: 53,
      },
    ],
  };
}

function detail(): ChampionDetail {
  return {
    id: 223,
    name: "탐 켄치",
    title: "",
    key: "TahmKench",
    iconUrl: "https://cdn.communitydragon.org/latest/champion/223/square",
    roles: [],
    grade: "S",
    pickRate: 15,
    winRate: 53,
    patch: "16.23",
    augments: [],
    coreItems: [],
    startingItems: [],
    summoners: [],
    skillOrder: "",
    trios: [],
  };
}
