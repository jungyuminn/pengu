import { describe, expect, it } from "vitest";
import type { StatsSnapshot } from "../domain/augment";
import type { ChampionDetail } from "../domain/champion-detail";
import { CHAMPION_DETAIL_SCHEMA } from "./champion-detail-freshness";
import { HydrateChampionDetails } from "./hydrate-champion-details";

describe("HydrateChampionDetails", () => {
  it("downloads only missing champions and writes them locally", async () => {
    const written: number[] = [];
    const requested: number[][] = [];
    const hydrate = new HydrateChampionDetails(
      {
        fetch: async () => detail(1),
        fetchBulk: async (ids) => {
          requested.push(ids);
          return ids.map(detail);
        },
      },
      {
        read: async (id) =>
          id === 1 ? { syncedAt: new Date().toISOString(), schema: CHAMPION_DETAIL_SCHEMA, detail: detail(1) } : null,
        write: async (id) => {
          written.push(id);
        },
      },
      { read: async () => snapshot([1, 2, 3]), write: async () => undefined },
    );

    await hydrate.execute();
    expect(requested).toEqual([[2, 3]]);
    expect(written).toEqual([2, 3]);
  });

  it("skips the network when every champion is already cached today", async () => {
    let bulkCalls = 0;
    const hydrate = new HydrateChampionDetails(
      {
        fetch: async () => detail(1),
        fetchBulk: async () => {
          bulkCalls += 1;
          return [];
        },
      },
      {
        read: async (id) => ({
          syncedAt: new Date().toISOString(),
          schema: CHAMPION_DETAIL_SCHEMA,
          detail: detail(id),
        }),
        write: async () => undefined,
      },
      { read: async () => snapshot([1, 2]), write: async () => undefined },
    );

    await hydrate.execute();
    expect(bulkCalls).toBe(0);
  });
});

function snapshot(ids: number[]): StatsSnapshot {
  return {
    patch: "16.23",
    source: "aramgg",
    syncedAt: new Date().toISOString(),
    attribution: "test",
    augments: [],
    champions: ids.map((id) => ({
      id,
      key: String(id),
      names: { ko: String(id), en: String(id) },
      title: "",
      iconUrl: null,
      grade: "S",
      pickRate: 1,
      winRate: 50,
    })),
  };
}

function detail(id: number): ChampionDetail {
  return {
    id,
    name: String(id),
    title: "",
    key: String(id),
    iconUrl: null,
    roles: [],
    grade: "S",
    pickRate: 1,
    winRate: 50,
    patch: "16.23",
    augments: [
      {
        id: 1,
        name: "거인",
        grade: "S",
        rarity: "prismatic",
        pickRate: 1,
        winRate: 50,
        iconUrl: null,
      },
    ],
    coreItems: [{ name: "강철심장", iconUrl: null }],
    startingItems: [],
    summoners: [{ name: "점멸", iconUrl: null }],
    skillOrder: "",
    trios: [],
  };
}
