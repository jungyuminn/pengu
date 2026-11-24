import type { OverlayView, StatsSnapshot } from "../domain/augment";
import type { ChampionDetail } from "../domain/champion-detail";
import type { ThemeMode } from "../domain/theme";

export interface StatsCache {
  read(): Promise<StatsSnapshot | null>;
  write(snapshot: StatsSnapshot): Promise<void>;
}

export interface RemoteCatalog {
  fetch(): Promise<StatsSnapshot>;
}

export interface ChampionName {
  id: number;
  key: string;
  name: string;
}

export interface ChampionNameIndex {
  fetch(): Promise<ChampionName[]>;
}

export interface SettingsStore {
  read(): Promise<AppSettings>;
  write(settings: AppSettings): Promise<void>;
}

export interface AppSettings {
  apiKey: string;
  overlayEnabled: boolean;
  overlayScale: number;
  theme: ThemeMode;
}

export interface LeagueSession {
  phase: string;
  championId: number | null;
  championName: string | null;
}

export interface LeagueReader {
  readSession(): Promise<LeagueSession | null>;
}

export interface ScreenReader {
  readCardTitles(): Promise<string[]>;
}

export interface OverlayPresenter {
  show(view: OverlayView): void;
}

export interface CachedChampionDetail {
  syncedAt: string;
  schema?: number;
  detail: ChampionDetail;
}

export interface ChampionDetailCache {
  read(championId: number): Promise<CachedChampionDetail | null>;
  write(championId: number, detail: ChampionDetail): Promise<void>;
}

export interface ChampionDetailCatalog {
  fetch(championId: number): Promise<ChampionDetail>;
  fetchBulk(ids: number[]): Promise<ChampionDetail[]>;
}

export interface GearNameIndex {
  itemById: Map<number, string>;
  itemByName: Map<string, string>;
  spellById: Map<number, string>;
  spellByName: Map<string, string>;
}

export interface GearNames {
  fetch(): Promise<GearNameIndex>;
}

export interface AugmentIcons {
  fetch(): Promise<Map<number, string>>;
}

export interface AugmentDescriptions {
  fetch(): Promise<Map<number, string>>;
}

export interface ChampionSkills {
  fetch(championKey: string): Promise<Map<string, string>>;
}

export interface SummonerSpellIcons {
  fetch(): Promise<Map<string, string>>;
}

export interface ItemIcons {
  fetch(): Promise<Map<string, string>>;
}

export interface ChampionPortraits {
  url(championKey: string): string | null;
}
