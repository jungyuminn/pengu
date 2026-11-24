import type { ChampionDetail } from "../domain/champion-detail";
import { isSyncedToday } from "./cache-freshness";
import { isFreshChampionDetail } from "./champion-detail-freshness";
import { emptyAugmentDescriptions, mergeAugmentDescriptions } from "./merge-augment-descriptions";
import { emptyAugmentIcons, mergeAugmentIcons } from "./merge-augment-icons";
import { emptyGearNames, mergeItemNames } from "./merge-item-names";
import { emptySkillIcons, mergeSkillIcons } from "./merge-skill-icons";
import { emptyItemIcons, mergeItemIcons } from "./merge-item-icons";
import { emptySpellIcons, mergeSpellIcons } from "./merge-spell-icons";
import { mergeDetailNames } from "./merge-detail-names";
import type {
  AugmentDescriptions,
  AugmentIcons,
  ChampionDetailCache,
  ChampionDetailCatalog,
  ChampionSkills,
  GearNames,
  ItemIcons,
  StatsCache,
  SummonerSpellIcons,
} from "./ports";

export class LoadChampionDetail {
  private readonly inflight = new Map<number, Promise<ChampionDetail>>();

  constructor(
    private readonly catalog: ChampionDetailCatalog,
    private readonly cache: ChampionDetailCache,
    private readonly stats: StatsCache,
    private readonly gear: GearNames = { fetch: async () => emptyGearNames() },
    private readonly augmentIcons: AugmentIcons = { fetch: async () => emptyAugmentIcons() },
    private readonly skillIcons: ChampionSkills = { fetch: async () => emptySkillIcons() },
    private readonly spellIcons: SummonerSpellIcons = { fetch: async () => emptySpellIcons() },
    private readonly itemIcons: ItemIcons = { fetch: async () => emptyItemIcons() },
    private readonly augmentDescriptions: AugmentDescriptions = { fetch: async () => emptyAugmentDescriptions() },
  ) {}

  execute(championId: number): Promise<ChampionDetail> {
    const existing = this.inflight.get(championId);
    if (existing) return existing;
    const work = this.load(championId).finally(() => this.inflight.delete(championId));
    this.inflight.set(championId, work);
    return work;
  }

  private async load(championId: number): Promise<ChampionDetail> {
    const snapshot = await this.stats.read();
    const cached = await this.cache.read(championId);
    if (cached && isSyncedToday(cached.syncedAt) && isFreshChampionDetail(cached, snapshot?.patch)) {
      return this.polish(cached.detail, snapshot);
    }

    const detail = await this.polish(await this.catalog.fetch(championId), snapshot);
    await this.cache.write(championId, detail);
    return detail;
  }

  private async polish(detail: ChampionDetail, snapshot: Awaited<ReturnType<StatsCache["read"]>>): Promise<ChampionDetail> {
    return mergeItemIcons(
      mergeSpellIcons(
        mergeItemNames(
          mergeSkillIcons(
            mergeAugmentDescriptions(
              mergeAugmentIcons(mergeDetailNames(detail, snapshot), await this.augmentIcons.fetch()),
              await this.augmentDescriptions.fetch(),
            ),
            await this.skillIcons.fetch(detail.key),
          ),
          await this.gear.fetch(),
        ),
        await this.spellIcons.fetch(),
      ),
      await this.itemIcons.fetch(),
    );
  }
}
