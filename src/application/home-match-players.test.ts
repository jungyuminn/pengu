import { describe, expect, it } from "vitest";
import { toHomePlayers } from "./home-match-players";
import type { MayhemMatch } from "../domain/mayhem";

describe("toHomePlayers", () => {
  it("marks the logged-in summoner and keeps item slots", () => {
    const players = toHomePlayers(
      match(),
      "me",
      [{ id: 81, key: "Ezreal", names: { ko: "이즈리얼", en: "Ezreal" }, title: "", iconUrl: "ez.png", grade: "S", pickRate: 1, winRate: 50 }],
      [{ id: "1001", numericId: 1001, names: { ko: "은1", en: "s1" }, rarity: "silver", grade: "S", pickRate: 1, sample: 1 }],
      {
        augmentIcons: new Map([[1001, "a.png"]]),
        augmentTexts: new Map([[1001, "설명"]]),
        itemIcons: new Map([["3006", "boot.png"]]),
        itemNames: new Map([[3006, "광전사의 군화"]]),
        itemTexts: new Map([[3006, "공격 속도가 증가합니다."]]),
        spellIcons: new Map([["4", "flash.png"]]),
      },
    );
    expect(players[0]?.self).toBe(true);
    expect(players[0]?.mvp).toBe(false);
    expect(players[0]?.championName).toBe("이즈리얼");
    expect(players[0]?.items[0]).toEqual({
      id: 3006,
      name: "광전사의 군화",
      iconUrl: "boot.png",
      description: "공격 속도가 증가합니다.",
    });
    expect(players[0]?.spells[0]?.iconUrl).toBe("flash.png");
    expect(players[0]?.augments[0]).toEqual({ id: 1001, name: "은1", iconUrl: "a.png", description: "설명" });
  });

  it("marks the lobby MVP from damage and KDA even on the losing team", () => {
    const players = toHomePlayers(
      match({
        players: [
          player({ puuid: "me", kills: 4, deaths: 6, assists: 5, damage: 11000 }),
          player({
            puuid: "ace",
            gameName: "에이스",
            tagLine: "KR1",
            championId: 1,
            kills: 14,
            deaths: 2,
            assists: 9,
            damage: 31000,
          }),
          player({
            puuid: "foe",
            gameName: "상대",
            tagLine: "KR1",
            teamId: 200,
            win: false,
            championId: 99,
            kills: 18,
            deaths: 3,
            assists: 4,
            damage: 42000,
          }),
        ],
      }),
      "me",
      [],
      [],
      emptyAssets(),
    );
    expect(players.map((row) => row.mvp)).toEqual([false, false, true]);
  });
});

function match(partial: Partial<MayhemMatch> = {}): MayhemMatch {
  return {
    gameId: 1,
    playedAt: 1,
    durationSec: 600,
    championId: 81,
    win: true,
    kills: 2,
    deaths: 1,
    assists: 3,
    augmentIds: [1001],
    players: [player({})],
    ...partial,
  };
}

function player(partial: Partial<MayhemMatch["players"][number]>): MayhemMatch["players"][number] {
  return {
    puuid: "me",
    gameName: "펭귄",
    tagLine: "KR1",
    teamId: 100,
    championId: 81,
    win: true,
    kills: 2,
    deaths: 1,
    assists: 3,
    level: 16,
    gold: 9000,
    damage: 12000,
    cs: 80,
    spellIds: [4],
    itemIds: [3006, 0, 0, 0, 0, 0, 0],
    augmentIds: [1001],
    ...partial,
  };
}

function emptyAssets() {
  return {
    augmentIcons: new Map<number, string>(),
    augmentTexts: new Map<number, string>(),
    itemIcons: new Map<string, string>(),
    itemNames: new Map<number, string>(),
    itemTexts: new Map<number, string>(),
    spellIcons: new Map<string, string>(),
  };
}
