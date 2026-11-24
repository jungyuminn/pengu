import { describe, expect, it } from "vitest";
import type { StatsSnapshot } from "../domain/augment";
import type { ChampionNameIndex, RemoteCatalog, StatsCache } from "./ports";
import { SyncStats } from "./sync-stats";

const aramgg: StatsSnapshot = {
  patch: "26.23",
  source: "aramgg",
  syncedAt: "2026-11-24T00:00:00.000Z",
  attribution: "Data: aramgg.com",
  augments: [
    {
      id: "bees",
      numericId: null,
      names: { ko: "BEES!!!", en: "BEES!!!" },
      rarity: "gold",
      grade: "S",
      pickRate: 49,
      sample: null,
    },
  ],
  champions: [
    {
      id: 223,
      key: "TahmKench",
      names: { ko: "塔姆", en: "TahmKench" },
      title: "",
      iconUrl: null,
      grade: "S",
      pickRate: 15,
      winRate: null,
    },
  ],
};

class MemoryCache implements StatsCache {
  constructor(private snapshot: StatsSnapshot | null = null) {}
  async read(): Promise<StatsSnapshot | null> {
    return this.snapshot;
  }
  async write(next: StatsSnapshot): Promise<void> {
    this.snapshot = next;
  }
}

class FixedCatalog implements RemoteCatalog {
  constructor(
    private readonly snapshot: StatsSnapshot,
    private readonly error?: Error,
  ) {}
  fetches = 0;
  async fetch(): Promise<StatsSnapshot> {
    this.fetches += 1;
    if (this.error) throw this.error;
    return this.snapshot;
  }
}

const names: ChampionNameIndex = {
  async fetch() {
    return [{ id: 223, key: "TahmKench", name: "탐 켄치" }];
  },
};

describe("SyncStats", () => {
  it("writes aramgg data and Korean champion names", async () => {
    const catalog = new FixedCatalog(aramgg);
    const cache = new MemoryCache();
    const result = await new SyncStats(catalog, cache, names).execute(true);

    expect(result.skipped).toBe(false);
    expect(result.snapshot.source).toBe("aramgg");
    expect(result.snapshot.champions[0]?.names.ko).toBe("탐 켄치");
    expect(catalog.fetches).toBe(1);
  });

  it("ignores leftover public-data cache", async () => {
    const catalog = new FixedCatalog(aramgg);
    const cache = new MemoryCache({ ...aramgg, source: "arammayhem" });
    const result = await new SyncStats(catalog, cache, names).execute(false);

    expect(result.skipped).toBe(false);
    expect(result.snapshot.source).toBe("aramgg");
  });

  it("skips extra name lookup when Korean names are already present", async () => {
    const catalog = new FixedCatalog({
      ...aramgg,
      champions: [
        {
          ...aramgg.champions[0]!,
          names: { ko: "탐 켄치", en: "TahmKench" },
          iconUrl: "https://example/223.png",
          winRate: 53.8,
        },
      ],
    });
    const namesIndex: ChampionNameIndex = {
      async fetch() {
        throw new Error("should not fetch names");
      },
    };
    const result = await new SyncStats(catalog, new MemoryCache(), namesIndex).execute(true);
    expect(result.snapshot.champions[0]?.names.ko).toBe("탐 켄치");
  });

  it("does not invent a public fallback when aramgg fails", async () => {
    const catalog = new FixedCatalog(aramgg, new Error("aramgg down"));
    const cache = new MemoryCache();
    const sync = new SyncStats(catalog, cache, names);

    await expect(sync.execute(true)).rejects.toThrow("aramgg down");
    expect(await cache.read()).toBeNull();
  });
});
