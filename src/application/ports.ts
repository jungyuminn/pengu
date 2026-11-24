import type { OverlayItem, OverlayView, StatsSnapshot } from "../domain/augment";
import type { ChampionAugmentRow, ChampionDetail } from "../domain/champion-detail";
import type { MayhemProfile } from "../domain/mayhem";
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

export interface LeagueWindowModeStore {
  read(): Promise<number | null>;
  write(mode: number): Promise<void>;
}

export interface MayhemHistoryStore {
  readActive(): Promise<MayhemProfile | null>;
  read(puuid: string): Promise<MayhemProfile | null>;
  write(profile: MayhemProfile): Promise<void>;
}

export interface MayhemHistorySource {
  fetchRecent(knownIds: ReadonlySet<number>, pages: number): Promise<MayhemProfile | null>;
}

export interface ScreenPage {
  hasWindow: boolean;
  text: string;
  cardCount?: number;
  hint?: string;
}

export interface ScreenReader {
  read(): Promise<ScreenPage>;
}

export interface LiveGame {
  gameTime: number;
  level: number;
  isDead: boolean;
  championName?: string | null;
  started?: boolean;
}

export interface OverlayBuildSource {
  itemsFor(championId: number): Promise<OverlayItem[]>;
  augmentsFor?(championId: number): Promise<ChampionAugmentRow[]>;
}

export interface LiveGameReader {
  read(): Promise<LiveGame | null>;
}

export interface GamePresence {
  present(): Promise<boolean>;
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

export type BulkProgress = (done: number, total: number) => void;

export interface ChampionDetailCatalog {
  fetch(championId: number): Promise<ChampionDetail>;
  fetchBulk(ids: number[], onProgress?: BulkProgress): Promise<ChampionDetail[]>;
}

export interface GearNameIndex {
  itemById: Map<number, string>;
  itemByName: Map<string, string>;
  itemTextById: Map<number, string>;
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
