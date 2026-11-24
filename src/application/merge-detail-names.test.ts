import { describe, expect, it } from "vitest";
import type { StatsSnapshot } from "../domain/augment";
import type { ChampionDetail } from "../domain/champion-detail";
import { mergeDetailNames } from "./merge-detail-names";

describe("mergeDetailNames", () => {
  it("copies Korean names from the daily snapshot", () => {
    const snapshot: StatsSnapshot = {
      patch: "16.23",
      source: "aramgg",
      syncedAt: "2026-11-24T00:00:00.000Z",
      attribution: "test",
      augments: [
        {
          id: "goliath",
          numericId: 1041,
          names: { ko: "거인", en: "Goliath" },
          rarity: "prismatic",
          grade: "S",
          pickRate: 32,
          sample: null,
        },
      ],
      champions: [
        {
          id: 223,
          key: "TahmKench",
          names: { ko: "탐 켄치", en: "TahmKench" },
          title: "강의 폭군",
          iconUrl: null,
          grade: "S",
          pickRate: 15,
          winRate: 53,
        },
      ],
    };
    const detail: ChampionDetail = {
      id: 223,
      name: "塔姆",
      title: "",
      key: "TahmKench",
      iconUrl: null,
      roles: [],
      grade: "S",
      pickRate: 15,
      winRate: 53,
      patch: "16.23",
      augments: [
        {
          id: 1041,
          name: "巨人",
          grade: "S",
          rarity: "prismatic",
          pickRate: 32,
          winRate: 60,
          iconUrl: null,
        },
      ],
      coreItems: [],
      startingItems: [],
      summoners: [],
      skillOrder: "Q > W > E",
      trios: [{ ids: [1041], names: ["巨人"], icons: [], winRate: 70 }],
    };

    const merged = mergeDetailNames(detail, snapshot);
    expect(merged.name).toBe("탐 켄치");
    expect(merged.augments[0]?.name).toBe("거인");
    expect(merged.trios[0]?.names).toEqual(["거인"]);
    expect(merged.trios[0]?.icons[0]?.name).toBe("거인");
  });

  it("keeps trio names when cached rows have no ids", () => {
    const snapshot: StatsSnapshot = {
      patch: "16.23",
      source: "aramgg",
      syncedAt: "2026-11-24T00:00:00.000Z",
      attribution: "test",
      augments: [],
      champions: [],
    };
    const merged = mergeDetailNames(
      {
        id: 223,
        name: "탐 켄치",
        title: "",
        key: "TahmKench",
        iconUrl: null,
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
        trios: [{ names: ["거인", "탱크 엔진"], winRate: 70 } as never],
      },
      snapshot,
    );
    expect(merged.trios[0]?.names).toEqual(["거인", "탱크 엔진"]);
  });
});
