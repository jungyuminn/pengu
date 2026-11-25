import { describe, expect, it } from "vitest";
import { mapChampionDetail, mapChampionShard, skillPriority } from "./detail-mapper";

describe("mapChampionDetail", () => {
  it("maps Tahm Kench stats, top augments and skill order", () => {
    const detail = mapChampionDetail({
      meta: { gamePatch: "16.23" },
      data: {
        champion: {
          id: 223,
          alias: "TahmKench",
          name: "탐 켄치",
          title: "강의 폭군",
          roles: ["tank"],
          iconUrl: "https://example/223.png",
          stats: { tier: 1, pickRate: 0.1563, winRate: 0.5383 },
        },
        augments: [
          { name: "거인", rarityName: "prismatic", stats: { tier: 1, rank: 1, pickRate: 0.32, winRate: 0.6 } },
        ],
        builds: [
          {
            skillOrders: [{ skillKeys: ["Q", "W", "E", "Q", "Q", "R"] }],
            coreItems: [{ items: [{ name: "강철심장", iconUrl: "https://example/item.png" }] }],
            summonerSpells: [{ spells: [{ name: "점멸" }, { name: "표식" }] }],
          },
        ],
      },
    });

    expect(detail.name).toBe("탐 켄치");
    expect(detail.grade).toBe("S");
    expect(detail.winRate).toBe(53.83);
    expect(detail.augments[0]?.name).toBe("거인");
    expect(detail.skillOrder).toBe("Q > W > E");
    expect(detail.coreItems[0]?.name).toBe("강철심장");
  });

  it("resolves item and summoner ids through the lookup", () => {
    const detail = mapChampionDetail(
      {
        champion: { id: 223, alias: "TahmKench", name: "탐 켄치", stats: { tier: 1 } },
        builds: [
          {
            coreItems: [{ itemIds: [3084] }],
            startingItems: [{ itemIds: [1006], games: 3 }],
            summonerSpells: [{ summonerSpellIds: [4, 32] }],
            skillOrders: [{ skillKeys: ["Q", "W", "E"] }],
          },
        ],
      },
      {
        items: new Map([
          [3084, { name: "강철심장", iconUrl: "https://example/3084.png" }],
          [1006, { name: "원기 회복의 구슬", iconUrl: null }],
        ]),
        spells: new Map([[4, { name: "점멸", iconUrl: null }], [32, { name: "표식", iconUrl: null }]]),
      },
    );
    expect(detail.coreItems.map((item) => item.name)).toEqual(["강철심장"]);
    expect(detail.startingItems.map((item) => item.name)).toEqual(["원기 회복의 구슬"]);
    expect(detail.summoners.map((item) => item.name)).toEqual(["점멸", "표식"]);
  });

  it("fills six item slots from the core set plus extensions", () => {
    const detail = mapChampionDetail(
      {
        champion: { id: 81, alias: "Ezreal", name: "이즈리얼", stats: { tier: 1 } },
        builds: [
          {
            coreItems: [{ itemIds: [3078, 3158, 3004] }],
            itemExtensions: [
              { coreItemIds: [3078, 3158, 3004], step: 1, itemIds: [3161], games: 2118 },
              { coreItemIds: [3078, 3158, 3004], step: 2, itemIds: [3161, 6694], games: 1248 },
              { coreItemIds: [3078, 3158, 3004], step: 3, itemIds: [3153, 3161, 6694], games: 354 },
              { coreItemIds: [1, 2, 3], step: 3, itemIds: [999], games: 99 },
            ],
          },
        ],
      },
      {
        items: new Map([
          [3078, { name: "삼위일체", iconUrl: null }],
          [3158, { name: "명석함의 아이오니아 장화", iconUrl: null }],
          [3004, { name: "마나무네", iconUrl: null }],
          [3161, { name: "쇼진의 창", iconUrl: null }],
          [6694, { name: "세릴다의 원한", iconUrl: null }],
          [3153, { name: "몰락한 왕의 검", iconUrl: null }],
        ]),
        spells: new Map(),
      },
    );
    expect(detail.coreItems.map((item) => item.name)).toEqual([
      "삼위일체",
      "마나무네",
      "쇼진의 창",
      "세릴다의 원한",
      "몰락한 왕의 검",
    ]);
  });

  it("keeps every ranked augment so the overlay can grade the whole pool", () => {
    const augments = ["silver", "gold", "prismatic"].flatMap((rarity) =>
      Array.from({ length: 12 }, (_, index) => ({
        name: `${rarity}-${index}`,
        rarityName: rarity,
        stats: { tier: 1, rank: index + 1 },
      })),
    );
    const detail = mapChampionDetail({
      champion: { id: 1, alias: "Annie", name: "애니", stats: { tier: 2 } },
      augments,
    });
    expect(detail.augments.filter((row) => row.rarity === "silver")).toHaveLength(12);
    expect(detail.augments.filter((row) => row.rarity === "gold")).toHaveLength(12);
    expect(detail.augments.filter((row) => row.rarity === "prismatic")).toHaveLength(12);
    expect(detail.augments[0]?.rarity).toBe("silver");
  });
});

describe("mapChampionShard", () => {
  it("maps bundled champion payloads without a data wrapper", () => {
    const details = mapChampionShard({
      champions: {
        "1": {
          champion: {
            id: 1,
            alias: "Annie",
            name: "애니",
            stats: { tier: 2, pickRate: 0.02, winRate: 0.5, gamePatch: "16.23" },
          },
          augments: [{ id: 1002, name: "거인", rarityName: "prismatic", stats: { tier: 1, rank: 1 } }],
        },
      },
    });
    expect(details).toHaveLength(1);
    expect(details[0]?.id).toBe(1);
    expect(details[0]?.name).toBe("애니");
    expect(details[0]?.augments[0]?.name).toBe("거인");
  });
});

describe("skillPriority", () => {
  it("uses first unique keys when the path is too short to max", () => {
    expect(skillPriority(["Q", "W", "E", "Q", "R"])).toBe("Q > W > E");
  });

  it("uses the order skills reach rank 5, not the first three points", () => {
    expect(
      skillPriority([
        "Q", "W", "E", "Q", "Q", "R", "Q", "E", "Q", "E", "R", "E", "E", "W", "W", "R", "W", "W",
      ]),
    ).toBe("Q > E > W");
    expect(
      skillPriority([
        "Q", "W", "E", "W", "W", "R", "W", "E", "W", "E", "R", "E", "E", "Q", "Q", "R", "Q", "Q",
      ]),
    ).toBe("W > E > Q");
  });

  it("keeps R when it is a basic stance that is maxed", () => {
    expect(
      skillPriority([
        "R", "E", "W", "R", "R", "W", "R", "W", "R", "W", "R", "W", "W", "E", "E", "E", "E", "E",
      ]),
    ).toBe("R > W > E");
  });
});
