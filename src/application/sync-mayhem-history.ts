import { hasMayhemBoard, type MayhemProfile } from "../domain/mayhem";
import { mergeMayhemMatches } from "./merge-mayhem-matches";
import type { MayhemHistorySource, MayhemHistoryStore } from "./ports";

const DEEP_PAGES = 5;
const FRESH_PAGES = 1;
const DEEP_EVERY_MS = 6 * 60 * 60 * 1000;

export class SyncMayhemHistory {
  private busy: Promise<MayhemProfile | null> | null = null;
  private lastDeepAt = 0;

  constructor(
    private readonly source: MayhemHistorySource,
    private readonly store: MayhemHistoryStore,
  ) {}

  execute(forceDeep = false): Promise<MayhemProfile | null> {
    if (this.busy) return this.busy;
    this.busy = this.run(forceDeep).finally(() => {
      this.busy = null;
    });
    return this.busy;
  }

  private async run(forceDeep: boolean): Promise<MayhemProfile | null> {
    const active = await this.store.readActive();
    const deep = forceDeep || Date.now() - this.lastDeepAt > DEEP_EVERY_MS;
    const incoming = await this.source.fetchRecent(
      new Set((active?.matches ?? []).filter(hasMayhemBoard).map((row) => row.gameId)),
      deep ? DEEP_PAGES : FRESH_PAGES,
    );
    if (!incoming) return active;
    if (deep) this.lastDeepAt = Date.now();

    const stored = incoming.puuid === active?.puuid ? active : await this.store.read(incoming.puuid);
    const profile: MayhemProfile = {
      puuid: incoming.puuid,
      gameName: incoming.gameName || stored?.gameName || "",
      tagLine: incoming.tagLine || stored?.tagLine || "",
      profileIconId: incoming.profileIconId ?? stored?.profileIconId ?? null,
      matches: mergeMayhemMatches(stored?.matches ?? [], incoming.matches),
    };
    await this.store.write(profile);
    return profile;
  }
}
