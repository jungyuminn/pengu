import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { ChampionDetail } from "../../domain/champion-detail";
import { CHAMPION_DETAIL_SCHEMA } from "../../application/champion-detail-freshness";
import type { ChampionDetailCache, CachedChampionDetail } from "../../application/ports";

export class FileChampionDetailCache implements ChampionDetailCache {
  private readonly memory = new Map<number, CachedChampionDetail>();

  constructor(private readonly directory: string) {}

  async read(championId: number): Promise<CachedChampionDetail | null> {
    const hit = this.memory.get(championId);
    if (hit) return hit;
    try {
      const raw = await readFile(this.filePath(championId), "utf8");
      const parsed = JSON.parse(raw) as CachedChampionDetail;
      this.memory.set(championId, parsed);
      return parsed;
    } catch {
      return null;
    }
  }

  async write(championId: number, detail: ChampionDetail): Promise<void> {
    const payload: CachedChampionDetail = {
      syncedAt: new Date().toISOString(),
      schema: CHAMPION_DETAIL_SCHEMA,
      detail,
    };
    this.memory.set(championId, payload);
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.filePath(championId), JSON.stringify(payload), "utf8");
  }

  private filePath(championId: number): string {
    return path.join(this.directory, `${championId}.json`);
  }
}
