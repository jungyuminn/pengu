import { describe, expect, it } from "vitest";
import type { StatsSnapshot } from "../domain/augment";
import { buildHomeFeed } from "./home-feed";

describe("buildHomeFeed", () => {
  it("picks overall S champions and augments for the patch meta", () => {
    const feed = buildHomeFeed(snapshot(), null, new Map([[1001, "a.png"]]));
    expect(feed.patchLabel).toBe("26.23");
    expect(feed.metaChampions.map((item) => item.id)).toEqual([2, 1]);
    expect(feed.metaAugments.map((item) => item.name)).toEqual(["은1", "금1"]);
    expect(feed.metaAugments[0]?.iconUrl).toBe("a.png");
  });

  it("summarizes stored mayhem games for the current account", () => {
    const feed = buildHomeFeed(
      snapshot(),
      {
        puuid: "p",
        gameName: "펭귄",
        tagLine: "KR1",
        profileIconId: 29,
        matches: [
          {
            gameId: 9,
            playedAt: 2,
            championId: 2,
            win: true,
            kills: 8,
            durationSec: 1200,
            deaths: 2,
            assists: 11,
            augmentIds: [1001],
            players: [],
          },
          {
            gameId: 8,
            playedAt: 1,
            championId: 1,
            win: false,
            kills: 1,
            durationSec: 900,
            deaths: 7,
            assists: 3,
            augmentIds: [],
            players: [],
          },
        ],
      },
      new Map([[1001, "a.png"]]),
      new Map([[1001, "은색 증강 설명"]]),
    );
    expect(feed.account?.gameName).toBe("펭귄");
    expect(feed.account?.iconUrl).toBe("https://cdn.communitydragon.org/latest/profile-icon/29");
    expect(feed.games).toBe(2);
    expect(feed.wins).toBe(1);
    expect(feed.winRate).toBe(50);
    expect(feed.kda).toBe("2.56");
    expect(feed.matches[0]?.championName).toBe("이즈");
    expect(feed.matches[0]?.kda).toBe("9.50");
    expect(feed.matches[0]?.mvp).toBe(false);
    expect(feed.matches[1]?.kda).toBe("0.57");
    expect(feed.matches[0]?.augments[0]).toEqual({
      id: 1001,
      name: "은1",
      iconUrl: "a.png",
      description: "은색 증강 설명",
    });
  });

  it("marks a match as MVP when the logged-in player led the lobby", () => {
    const feed = buildHomeFeed(snapshot(), {
      puuid: "p",
      gameName: "펭귄",
      tagLine: "KR1",
      matches: [
        {
          gameId: 3,
          playedAt: 1,
          championId: 2,
          win: false,
          kills: 16,
          deaths: 3,
          assists: 8,
          durationSec: 900,
          augmentIds: [],
          players: [
            boardPlayer({ puuid: "p", championId: 2, win: false, kills: 16, deaths: 3, assists: 8, damage: 38000 }),
            boardPlayer({ puuid: "foe", teamId: 200, win: true, kills: 9, deaths: 6, assists: 4, damage: 16000 }),
          ],
        },
      ],
    }, new Map());
    expect(feed.matches[0]?.mvp).toBe(true);
  });
});

function snapshot(): StatsSnapshot {
  return {
    patch: "16.23",
    source: "aramgg",
    syncedAt: "now",
    attribution: "",
    champions: [
      champ(1, "애니", "S", 3, 54),
      champ(2, "이즈", "S", 12, 58),
      champ(9, "애쉬", "C", 20, 45),
    ],
    augments: [
      augment(1001, "은1", "silver", "S", 9, 63),
      augment(1002, "은2", "silver", "C", 80, 41),
      augment(2001, "금1", "gold", "S", 8, 60),
      augment(3001, "프1", "prismatic", "A", 7, 58),
    ],
  };
}

function champ(id: number, name: string, grade: "S" | "A" | "B" | "C", pickRate: number, winRate: number) {
  return {
    id,
    key: name,
    names: { ko: name, en: name },
    title: "",
    iconUrl: `${id}.png`,
    grade,
    pickRate,
    winRate,
  };
}

function augment(
  id: number,
  name: string,
  rarity: "silver" | "gold" | "prismatic",
  grade: "S" | "A" | "B" | "C",
  pickRate: number,
  winRate: number,
) {
  return {
    id: String(id),
    numericId: id,
    names: { ko: name, en: name },
    rarity,
    grade,
    pickRate,
    winRate,
    sample: 10,
  };
}

function boardPlayer(partial: {
  puuid: string;
  championId?: number;
  teamId?: number;
  win?: boolean;
  kills?: number;
  deaths?: number;
  assists?: number;
  damage?: number;
}) {
  return {
    puuid: partial.puuid,
    gameName: partial.puuid,
    tagLine: "KR1",
    teamId: partial.teamId ?? 100,
    championId: partial.championId ?? 1,
    win: partial.win ?? false,
    kills: partial.kills ?? 0,
    deaths: partial.deaths ?? 0,
    assists: partial.assists ?? 0,
    level: 16,
    gold: 8000,
    damage: partial.damage ?? 0,
    cs: 50,
    spellIds: [],
    itemIds: [0, 0, 0, 0, 0, 0, 0],
    augmentIds: [],
  };
}
