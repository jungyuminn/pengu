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

export class HydrateChampionDetails {
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

  async execute(): Promise<void> {
    const snapshot = await this.stats.read();
    const ids = snapshot?.champions.map((item) => item.id).filter((id) => id > 0) ?? [];
    const missing: number[] = [];
    for (const id of ids) {
      const cached = await this.cache.read(id);
      if (cached && isSyncedToday(cached.syncedAt) && isFreshChampionDetail(cached, snapshot?.patch)) {
        continue;
      }
      missing.push(id);
    }
    if (missing.length === 0) return;

    const [names, icons, texts, spells, items] = await Promise.all([
      this.gear.fetch(),
      this.augmentIcons.fetch(),
      this.augmentDescriptions.fetch(),
      this.spellIcons.fetch(),
      this.itemIcons.fetch(),
    ]);
    const details = await this.catalog.fetchBulk(missing);
    for (const detail of details) {
      await this.cache.write(
        detail.id,
        mergeItemIcons(
          mergeSpellIcons(
            mergeItemNames(
              mergeSkillIcons(
                mergeAugmentDescriptions(mergeAugmentIcons(mergeDetailNames(detail, snapshot), icons), texts),
                await this.skillIcons.fetch(detail.key),
              ),
              names,
            ),
            spells,
          ),
          items,
        ),
      );
    }
  }
}
