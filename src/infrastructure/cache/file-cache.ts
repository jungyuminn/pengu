import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { StatsSnapshot } from "../../domain/augment";
import type { StatsCache } from "../../application/ports";

export class FileStatsCache implements StatsCache {
  private memory: StatsSnapshot | null | undefined;

  constructor(private readonly filePath: string) {}

  async read(): Promise<StatsSnapshot | null> {
    if (this.memory !== undefined) return this.memory;
    try {
      const raw = await readFile(this.filePath, "utf8");
      this.memory = JSON.parse(raw) as StatsSnapshot;
      return this.memory;
    } catch {
      this.memory = null;
      return null;
    }
  }

  async write(snapshot: StatsSnapshot): Promise<void> {
    this.memory = snapshot;
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(snapshot), "utf8");
  }
}
