import { overlayChampionFor } from "../domain/champion";
import type { OverlayView, StatsSnapshot } from "../domain/augment";
import { resolveOverlay } from "./resolve-overlay";
import type { LeagueReader, ScreenReader, StatsCache } from "./ports";

const CHAMPION_PHASES = new Set(["ChampSelect", "GameStart", "InProgress", "Reconnect"]);

export class OverlayCycle {
  constructor(
    private readonly cache: StatsCache,
    private readonly league: LeagueReader,
    private readonly screen: ScreenReader,
  ) {}

  async tick(): Promise<{ view: OverlayView; snapshot: StatsSnapshot | null }> {
    const snapshot = await this.cache.read();
    const session = await this.league.readSession();
    const champion = overlayChampionFor(snapshot?.champions ?? [], session?.championId);

    if (!session || !CHAMPION_PHASES.has(session.phase)) {
      return { snapshot, view: hidden(snapshot) };
    }

    if (session.phase !== "InProgress") {
      return {
        snapshot,
        view: {
          visible: champion !== null,
          champion,
          source: snapshot?.source ?? null,
          cards: [],
        },
      };
    }

    const titles = await this.screen.readCardTitles();
    return {
      snapshot,
      view: resolveOverlay(snapshot, champion, titles),
    };
  }
}

function hidden(snapshot: StatsSnapshot | null): OverlayView {
  return {
    visible: false,
    champion: null,
    source: snapshot?.source ?? null,
    cards: [],
  };
}
