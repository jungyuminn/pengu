import type { ChampionDetail } from "../../domain/champion-detail";
import { getJson } from "../http";
import type { ClientLookup } from "./client-lookup";
import { mapChampionShard } from "./detail-mapper";

const DATA_BASE = "https://data.dtodo.cn/api/client/v1/data";
const CONCURRENCY = 6;

interface ShardIndex {
  shards?: Array<{ championIds?: number[]; path?: string }>;
}

export async function fetchChampionDetailsBulk(
  version: string,
  ids: number[],
  lookup?: ClientLookup,
  onProgress?: (done: number, total: number) => void,
): Promise<ChampionDetail[]> {
  if (ids.length === 0) return [];
  const wanted = new Set(ids);
  const index = await getJson<ShardIndex>(`${DATA_BASE}/${version}/champion-shards/index.json`);
  const shards = (index.shards ?? []).filter((shard) =>
    (shard.championIds ?? []).some((id) => wanted.has(id)),
  );
  let done = 0;
  const payloads = await mapPool(shards, CONCURRENCY, async (shard) => {
    const rows = await fetchShard(version, shard.path, lookup);
    const hit = rows.filter((detail) => wanted.has(detail.id));
    done += hit.length;
    onProgress?.(Math.min(done, ids.length), ids.length);
    return hit;
  });
  return payloads.flat();
}

async function fetchShard(
  version: string,
  path: string | undefined,
  lookup?: ClientLookup,
): Promise<ChampionDetail[]> {
  if (!path) return [];
  try {
    const payload = await getJson<Parameters<typeof mapChampionShard>[0]>(
      `${DATA_BASE}/${version}/${path}`,
    );
    return mapChampionShard(payload, lookup);
  } catch {
    return [];
  }
}

async function mapPool<T, R>(items: T[], concurrency: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await work(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) || 0 }, () => worker()));
  return results;
}
