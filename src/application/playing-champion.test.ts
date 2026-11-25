import { describe, expect, it } from "vitest";
import type { ChampionStat } from "../domain/champion";
import { playingChampionId } from "./playing-champion";

const yasuo: ChampionStat = {
  id: 157,
  key: "Yasuo",
  names: { ko: "야스오", en: "Yasuo" },
  title: "",
  iconUrl: null,
  grade: "A",
  pickRate: 12,
  winRate: null,
};

describe("playingChampionId", () => {
  it("uses the locked champion during champ select", () => {
    expect(
      playingChampionId({ phase: "ChampSelect", championId: 157, championName: null }, null, [yasuo]),
    ).toBe(157);
  });

  it("uses the live client name when Pengu starts mid-game", () => {
    expect(
      playingChampionId(
        { phase: "InProgress", championId: null, championName: null },
        { championName: "Yasuo" },
        [yasuo],
      ),
    ).toBe(157);
  });

  it("stays empty in lobby", () => {
    expect(playingChampionId({ phase: "Lobby", championId: null, championName: null }, null, [yasuo])).toBeNull();
    expect(playingChampionId(null, null, [yasuo])).toBeNull();
  });
});
