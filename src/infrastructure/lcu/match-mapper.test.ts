import { describe, expect, it } from "vitest";
import { gamesFromList, mapMayhemGame, summonerName } from "./match-mapper";

describe("match-mapper", () => {
  it("reads the logged-in summoner", () => {
    expect(summonerName({ puuid: "abc", gameName: "펭귄", tagLine: "KR1", profileIconId: 29 })).toEqual({
      puuid: "abc",
      gameName: "펭귄",
      tagLine: "KR1",
      profileIconId: 29,
    });
    expect(summonerName({ puuid: "abc", gameName: "펭귄", tagLine: "KR1" })).toEqual({
      puuid: "abc",
      gameName: "펭귄",
      tagLine: "KR1",
      profileIconId: null,
    });
    expect(summonerName({})).toBeNull();
  });

  it("maps a mayhem game for the current puuid", () => {
    const match = mapMayhemGame(
      {
        gameId: 77,
        gameCreation: 1000,
        queueId: 2400,
        participantIdentities: [
          { participantId: 1, player: { puuid: "foe" } },
          { participantId: 2, player: { puuid: "me" } },
        ],
        participants: [
          { participantId: 1, championId: 1, stats: { win: true, kills: 1, deaths: 0, assists: 0 } },
          {
            participantId: 2,
            championId: 81,
            stats: {
              win: false,
              kills: 4,
              deaths: 6,
              assists: 9,
              playerAugment1: 1048,
              playerAugment2: 0,
              playerAugment3: 3123,
            },
          },
        ],
      },
      "me",
    );
    expect(match).toEqual({
      gameId: 77,
      playedAt: 1000,
      durationSec: 0,
      championId: 81,
      win: false,
      kills: 4,
      deaths: 6,
      assists: 9,
      augmentIds: [1048, 3123],
      players: [
        {
          puuid: "foe",
          gameName: "",
          tagLine: "",
          teamId: 0,
          championId: 1,
          win: true,
          kills: 1,
          deaths: 0,
          assists: 0,
          level: 0,
          gold: 0,
          damage: 0,
          cs: 0,
          spellIds: [],
          itemIds: [0, 0, 0, 0, 0, 0, 0],
          augmentIds: [],
        },
        {
          puuid: "me",
          gameName: "",
          tagLine: "",
          teamId: 0,
          championId: 81,
          win: false,
          kills: 4,
          deaths: 6,
          assists: 9,
          level: 0,
          gold: 0,
          damage: 0,
          cs: 0,
          spellIds: [],
          itemIds: [0, 0, 0, 0, 0, 0, 0],
          augmentIds: [1048, 3123],
        },
      ],
    });
  });

  it("ignores summoners rift", () => {
    expect(mapMayhemGame({ gameId: 1, queueId: 420, participants: [{ championId: 1 }] }, "me")).toBeNull();
  });

  it("unwraps nested game lists", () => {
    expect(gamesFromList({ games: { games: [{ gameId: 1 }] } })).toHaveLength(1);
    expect(gamesFromList({ games: [{ gameId: 2 }] })).toHaveLength(1);
  });
});
