import type { OverlayView, StatsSnapshot } from "../../domain/augment";
import type { ChampionTierGroup } from "../../application/champion-tiers";
import type { HomeFeed } from "../../application/home-feed";
import type { AppSettings } from "../../application/ports";

export interface UiState {
  settings: AppSettings;
  snapshot: StatsSnapshot | null;
  overlay: OverlayView;
  leagueConnected: boolean;
  usingBuiltinKey: boolean;
  message: string;
  tiers: ChampionTierGroup[];
  home: HomeFeed;
}

export function emptyOverlay(): OverlayView {
  return {
    visible: false,
    champion: null,
    source: null,
    cards: [],
    build: [],
  };
}
