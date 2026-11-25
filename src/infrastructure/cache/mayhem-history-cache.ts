import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { MayhemHistoryStore } from "../../application/ports";
import type { MayhemProfile } from "../../domain/mayhem";

interface ActivePointer {
  puuid?: string;
}

export class FileMayhemHistoryStore implements MayhemHistoryStore {
  private active: MayhemProfile | null | undefined;

  constructor(private readonly directory: string) {}

  async readActive(): Promise<MayhemProfile | null> {
    if (this.active !== undefined) return this.active;
    const pointer = await this.readPointer();
    this.active = pointer ? await this.read(pointer) : null;
    return this.active;
  }

  async read(puuid: string): Promise<MayhemProfile | null> {
    if (!puuid) return null;
    try {
      const parsed = JSON.parse(await readFile(this.filePath(puuid), "utf8")) as MayhemProfile;
      if (!parsed?.puuid || !Array.isArray(parsed.matches)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async write(profile: MayhemProfile): Promise<void> {
    this.active = profile;
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.filePath(profile.puuid), JSON.stringify(profile), "utf8");
    await writeFile(this.pointerPath(), JSON.stringify({ puuid: profile.puuid } satisfies ActivePointer), "utf8");
  }

  private async readPointer(): Promise<string | null> {
    try {
      const parsed = JSON.parse(await readFile(this.pointerPath(), "utf8")) as ActivePointer;
      return parsed.puuid || null;
    } catch {
      return null;
    }
  }

  private filePath(puuid: string): string {
    return path.join(this.directory, `${puuid}.json`);
  }

  private pointerPath(): string {
    return path.join(this.directory, "active.json");
  }
}
