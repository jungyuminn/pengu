import type { Grade } from "./grade";
import type { Rarity } from "./augment";

export interface NamedIcon {
  id?: number | null;
  name: string;
  iconUrl: string | null;
  description?: string | null;
}

export interface ChampionSkill extends NamedIcon {
  key: string;
}

export interface ChampionAugmentRow {
  id: number | null;
  name: string;
  grade: Grade;
  rarity: Rarity;
  pickRate: number | null;
  winRate: number | null;
  iconUrl: string | null;
  description?: string | null;
}

export interface ChampionTrioRow {
  ids: number[];
  names: string[];
  icons: NamedIcon[];
  winRate: number | null;
}

export interface ChampionDetail {
  id: number;
  name: string;
  title: string;
  key: string;
  iconUrl: string | null;
  roles: string[];
  grade: Grade;
  pickRate: number | null;
  winRate: number | null;
  patch: string;
  augments: ChampionAugmentRow[];
  coreItems: NamedIcon[];
  startingItems: NamedIcon[];
  summoners: NamedIcon[];
  skillOrder: string;
  skills?: ChampionSkill[];
  trios: ChampionTrioRow[];
}
