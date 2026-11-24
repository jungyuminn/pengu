import type { StatsSnapshot } from "../domain/augment";
import { isSyncedToday } from "./cache-freshness";
import { mergeChampionNames } from "./merge-names";
import type { ChampionNameIndex, RemoteCatalog, StatsCache } from "./ports";

export interface SyncResult {
  snapshot: StatsSnapshot;
  skipped: boolean;
}

export class SyncStats {
  constructor(
    private readonly catalog: RemoteCatalog,
    private readonly cache: StatsCache,
    private readonly championNames: ChampionNameIndex,
  ) {}

  async execute(force = false): Promise<SyncResult> {
    const cached = await this.cache.read();
    if (!force && cached && isSyncedToday(cached.syncedAt) && hasUsableCache(cached)) {
      return { snapshot: cached, skipped: true };
    }

    const snapshot = await this.withChampionNames(await this.catalog.fetch());
    await this.cache.write(snapshot);
    return { snapshot, skipped: false };
  }

  private async withChampionNames(snapshot: StatsSnapshot): Promise<StatsSnapshot> {
    if (hasKoreanChampionNames(snapshot)) return snapshot;
    try {
      return mergeChampionNames(snapshot, await this.championNames.fetch());
    } catch {
      return snapshot;
    }
  }
}

function hasKoreanChampionNames(snapshot: StatsSnapshot): boolean {
  return snapshot.champions.some((item) => /[\uAC00-\uD7A3]/.test(item.names.ko));
}

function hasUsableCache(cached: StatsSnapshot): boolean {
  return (
    cached.source === "aramgg" &&
    cached.augments.length > 0 &&
    cached.champions.length > 0 &&
    cached.champions.some((item) => Boolean(item.iconUrl) && item.winRate != null)
  );
}
