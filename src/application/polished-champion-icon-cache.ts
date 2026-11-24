import type { StatsSnapshot } from "../domain/augment";
import { mergeChampionIcons } from "./merge-champion-icons";
import type { ChampionPortraits, StatsCache } from "./ports";

export class PolishedChampionIconCache implements StatsCache {
  constructor(
    private readonly inner: StatsCache,
    private readonly portraits: ChampionPortraits,
  ) {}

  async read(): Promise<StatsSnapshot | null> {
    const snapshot = await this.inner.read();
    return snapshot ? mergeChampionIcons(snapshot, this.portraits) : null;
  }

  write(snapshot: StatsSnapshot): Promise<void> {
    return this.inner.write(snapshot);
  }
}
