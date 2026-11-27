import { access, readFile } from "fs/promises";
import path from "path";
import type { CollectionSource } from "../../application/collect-matches";
import { InvalidSample, positiveId } from "../../domain/collection-match";
import { lcuSample } from "./lcu-sample";

async function readJson(file: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    if (error instanceof SyntaxError) throw new InvalidSample("invalid-json");
    throw error;
  }
}

// Each file is one bounded page. Account references are archive-local SHA-256 digests.
export class ArchiveSource implements CollectionSource {
  constructor(private readonly directory: string) {}

  async checkSeed(seed: string, resume: boolean) {
    await access(path.join(this.directory, "histories"));
    await access(path.join(this.directory, "matches"));
    if (!resume) await access(path.join(this.directory, "histories", seed, "0.json"));
  }

  async history(account: string, page: number) {
    if (!/^[a-f0-9]{64}$/.test(account)) throw new InvalidSample("account-reference");
    const data = await readJson(path.join(this.directory, "histories", account, page + ".json"));
    if (data === undefined) return null;
    if (!data || typeof data !== "object" || !("gameIds" in data) || !Array.isArray(data.gameIds) ||
        !data.gameIds.every(positiveId) || !("hasMore" in data) || typeof data.hasMore !== "boolean") {
      throw new InvalidSample("history-format");
    }
    return { gameIds: data.gameIds as number[], nextPage: data.hasMore ? page + 1 : null };
  }

  async detail(id: number) {
    const raw = await readJson(path.join(this.directory, "matches", id + ".json"));
    return raw === undefined ? null : lcuSample(raw);
  }
}
