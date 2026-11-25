import { describe, expect, it } from "vitest";
import { hasMayhemBoard, isMayhemQueue, richerMayhemMatch, type MayhemMatch, type MayhemPlayer } from "./mayhem";

describe("isMayhemQueue", () => {
  it("accepts queue 2400 and KIWI mode", () => {
    expect(isMayhemQueue(2400)).toBe(true);
    expect(isMayhemQueue(450, "KIWI")).toBe(true);
    expect(isMayhemQueue(450)).toBe(false);
    expect(isMayhemQueue(420, "CLASSIC")).toBe(false);
  });
});

describe("richerMayhemMatch", () => {
  it("keeps augment ids when the newer row has none", () => {
    const kept = richerMayhemMatch(match({ augmentIds: [1, 2] }), match({ augmentIds: [], win: false, kills: 9 }));
    expect(kept.augmentIds).toEqual([1, 2]);
    expect(kept.win).toBe(false);
    expect(kept.kills).toBe(9);
  });

  it("keeps a stored scoreboard when the incoming row is slim", () => {
    const kept = richerMayhemMatch(
      match({ players: [player({ puuid: "a" }), player({ puuid: "b" })] }),
      match({ players: [], durationSec: 0 }),
    );
    expect(kept.players).toHaveLength(2);
    expect(hasMayhemBoard(kept)).toBe(true);
  });
});

function match(partial: Partial<MayhemMatch>): MayhemMatch {
  return {
    gameId: 1,
    playedAt: 10,
    durationSec: 0,
    championId: 81,
    win: true,
    kills: 1,
    deaths: 2,
    assists: 3,
    augmentIds: [],
    players: [],
    ...partial,
  };
}

function player(partial: Partial<MayhemPlayer>): MayhemPlayer {
  return {
    puuid: "p",
    gameName: "펭귄",
    tagLine: "KR1",
    teamId: 100,
    championId: 81,
    win: true,
    kills: 1,
    deaths: 0,
    assists: 1,
    level: 18,
    gold: 1000,
    damage: 2000,
    cs: 40,
    spellIds: [4, 32],
    itemIds: [0, 0, 0, 0, 0, 0, 0],
    augmentIds: [],
    ...partial,
  };
}
