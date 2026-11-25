import { describe, expect, it } from "vitest";
import { liveBoardFromPayload, liveGameFromPayload } from "./map-board";

describe("liveBoardFromPayload", () => {
  it("reads scores, gold and champion keys from live client JSON", () => {
    const payload = {
      activePlayer: { riotId: "펭귄#KR1", summonerName: "펭귄", currentGold: 800, level: 7 },
      allPlayers: [
        {
          riotId: "펭귄#KR1",
          riotIdGameName: "펭귄",
          riotIdTagLine: "KR1",
          summonerName: "펭귄",
          team: "ORDER",
          championName: "Yasuo",
          rawChampionName: "game_character_displayname_Yasuo",
          level: 7,
          scores: { kills: 2, deaths: 1, assists: 4, creepScore: 33 },
          items: [{ itemID: 3078, slot: 0 }],
        },
      ],
      gameData: { gameTime: 95.4, gameMode: "ARAM" },
    };
    const board = liveBoardFromPayload(payload);
    expect(board?.selfGold).toBe(800);
    expect(board?.players[0]?.championName).toBe("Yasuo");
    expect(board?.players[0]?.kills).toBe(2);
    expect(board?.players[0]?.items).toEqual([{ id: 3078, slot: 0 }]);
    expect(liveGameFromPayload(payload)?.championName).toBe("Yasuo");
    expect(liveGameFromPayload(payload)?.started).toBe(true);
  });

  it("treats a live payload without GameStart as still loading", () => {
    const payload = {
      activePlayer: { riotId: "펭귄#KR1", level: 3 },
      allPlayers: [{ riotId: "펭귄#KR1", championName: "Yasuo", rawChampionName: "game_character_displayname_Yasuo" }],
      gameData: { gameTime: 0, gameMode: "ARAM" },
      events: { Events: [] },
    };
    expect(liveGameFromPayload(payload)?.started).toBe(false);
  });
});
