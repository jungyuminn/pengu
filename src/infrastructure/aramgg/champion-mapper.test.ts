import { describe, expect, it } from "vitest";
import { mapAramggChampions } from "./champion-mapper";

describe("mapAramggChampions", () => {
  it("maps numeric tier 1 to S without exposing win rate", () => {
    const champions = mapAramggChampions({
      data: [
        {
          id: 223,
          alias: "TahmKench",
          name: "塔姆",
          stats: { tier: 1, pickRate: 0.1563 },
        },
      ],
    });

    expect(champions).toEqual([
      {
        id: 223,
        key: "TahmKench",
        names: { ko: "塔姆", en: "TahmKench" },
        title: "",
        iconUrl: "https://cdn.communitydragon.org/latest/champion/223/square",
        grade: "S",
        pickRate: 15.63,
        winRate: null,
      },
    ]);
  });

  it("skips champions without a usable tier", () => {
    expect(
      mapAramggChampions({
        data: [{ id: 1, alias: "Annie", statsAvailable: false }],
      }),
    ).toEqual([]);
  });
});
