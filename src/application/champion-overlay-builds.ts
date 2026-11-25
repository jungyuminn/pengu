import type { OverlayItem } from "../domain/champion";
import type { ChampionAugmentRow } from "../domain/champion-detail";
import { overlayItemsFrom } from "./overlay-build";
import type { OverlayBuildSource } from "./ports";
import type { LoadChampionDetail } from "./load-champion-detail";

export class ChampionOverlayBuilds implements OverlayBuildSource {
  constructor(private readonly load: LoadChampionDetail) {}

  async itemsFor(championId: number): Promise<OverlayItem[]> {
    try {
      return overlayItemsFrom(await this.load.execute(championId));
    } catch {
      return [];
    }
  }

  async augmentsFor(championId: number): Promise<ChampionAugmentRow[]> {
    try {
      return (await this.load.execute(championId)).augments;
    } catch {
      return [];
    }
  }
}
