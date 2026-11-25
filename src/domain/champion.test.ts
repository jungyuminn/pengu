import { describe, expect, it } from "vitest";
import { overlayChampionByName, overlayChampionFor, type ChampionStat } from "./champion";

const tahm: ChampionStat = {
  id: 223,
  key: "TahmKench",
  names: { ko: "탐 켄치", en: "Tahm Kench" },
  title: "",
  iconUrl: null,
  grade: "S",
  pickRate: 15.6,
  winRate: 53.8,
};

describe("overlayChampionFor", () => {
  it("resolves a Korean name and grade from the Riot id", () => {
    expect(overlayChampionFor([tahm], 223)).toEqual({ name: "탐 켄치", grade: "S" });
  });

  it("returns null when the id is missing", () => {
    expect(overlayChampionFor([tahm], null)).toBeNull();
    expect(overlayChampionFor([tahm], 157)).toBeNull();
  });

  it("resolves a live client English name", () => {
    expect(overlayChampionByName([tahm], "TahmKench")?.name).toBe("탐 켄치");
    expect(overlayChampionByName([tahm], "Tahm Kench")?.name).toBe("탐 켄치");
    expect(overlayChampionByName([tahm], "tahm kench")?.name).toBe("탐 켄치");
    expect(overlayChampionByName([tahm], "game_character_displayname_TahmKench")?.name).toBe("탐 켄치");
  });
});
