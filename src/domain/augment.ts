import type { ChampionStat, OverlayChampion } from "./champion";
import type { Grade } from "./grade";

export type { ChampionStat, OverlayChampion } from "./champion";

export type Rarity = "silver" | "gold" | "prismatic" | "unknown";

export type StatsSource = "aramgg" | "arammayhem";

export interface AugmentNames {
  ko: string;
  en: string;
}

export interface AugmentStat {
  id: string;
  numericId: number | null;
  names: AugmentNames;
  rarity: Rarity;
  grade: Grade;
  pickRate: number | null;
  sample: number | null;
}

export interface StatsSnapshot {
  patch: string;
  source: StatsSource;
  syncedAt: string;
  attribution: string;
  augments: AugmentStat[];
  champions: ChampionStat[];
}

export interface OverlayCard {
  slot: number;
  query: string;
  augment: AugmentStat | null;
}

export interface OverlayView {
  visible: boolean;
  champion: OverlayChampion | null;
  source: StatsSource | null;
  cards: OverlayCard[];
}
