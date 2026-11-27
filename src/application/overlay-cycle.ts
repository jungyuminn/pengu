import {
  championIdFrom,
  overlayChampionByName,
  overlayChampionFor,
} from "../domain/champion";
import type { OverlayItem, OverlayView, StatsSnapshot } from "../domain/augment";
import type { ChampionAugmentRow } from "../domain/champion-detail";
import {
  MAX_OFFER_CARDS,
  MAYHEM_AUGMENT_LEVELS,
  skipMissedStartPick,
  shouldReadAugmentScreen,
} from "../domain/mayhem-augment";
import { isLikelyTitleSlotText, matchAugment } from "../domain/match-name";
import { offerCardsVisible } from "../domain/offer-frame";
import { offerMissNotice } from "../domain/offer-miss";
import { withOwnedOverlayItems } from "./overlay-build";
import { resolveOverlay } from "./resolve-overlay";
import type {
  LeagueReader,
  LiveGame,
  LiveGameReader,
  OverlayBuildSource,
  ScreenPage,
  ScreenReader,
  StatsCache,
} from "./ports";

const OCR_HUNT_MS = 60;
const WATCH_OCR_MS = 80;
const MISS_HIDE = 10;
const FRAME_MISS = 4;
const PLAYING = new Set(["GameStart", "InProgress"]);

export class OverlayCycle {
  private lastOcrAt = 0;
  private completed = 0;
  private lastOcrView: OverlayView | null = null;
  private watching = false;
  private misses = 0;
  private frameMisses = 0;
  private countedOffer = false;
  private wasDead = false;
  private lastLevel = 0;
  private levelMarkTime: number | null = null;
  private champCache: { id: number; items: OverlayItem[]; augments: ChampionAugmentRow[] } | null =
    null;
  private lastLog = "";
  private huntBusy = false;

  constructor(
    private readonly cache: StatsCache,
    private readonly league: LeagueReader,
    private readonly screen: ScreenReader,
    private readonly liveGame: LiveGameReader = { read: async () => null },
    private readonly builds: OverlayBuildSource = { itemsFor: async () => [] },
    private readonly logLine: (message: string) => void = () => undefined,
  ) {}

  async tick(): Promise<{ view: OverlayView; snapshot: StatsSnapshot | null; pinWindow: boolean }> {
    const snapshot = await this.cache.read();
    const session = await this.league.readSession();
    const live = session?.phase === "ChampSelect" ? null : await this.liveGame.read();
    const champions = snapshot?.champions ?? [];
    const championId = championIdFrom(champions, session?.championId, live?.championName);
    const champion =
      overlayChampionFor(champions, championId) ?? overlayChampionByName(champions, live?.championName);
    if (session?.phase === "ChampSelect") {
      this.resetMatch();
      if (!champion) {
        this.say("챔피언 선택");
        return { snapshot, pinWindow: false, view: hidden(snapshot) };
      }
      this.say(`챔피언 선택 · ${champion.name} ${champion.grade}`);
      return {
        snapshot,
        pinWindow: true,
        view: {
          visible: true,
          champion,
          source: snapshot?.source ?? null,
          cards: [],
          build: [],
        },
      };
    }

    const playing = PLAYING.has(session?.phase ?? "") || Boolean(live);
    if (!playing) {
      this.say(`대기 (${session?.phase ?? "없음"})`);
      this.resetMatch();
      return { snapshot, pinWindow: false, view: hidden(snapshot) };
    }

    if (!live) {
      this.say(`경기 데이터 없음 (${session?.phase ?? "없음"})`);
      this.resetOcr();
      return { snapshot, pinWindow: false, view: hidden(snapshot) };
    }

    if (!matchReady(live)) {
      this.say(`경기 시작 전 (${session?.phase ?? "없음"})`);
      this.resetOcr();
      return { snapshot, pinWindow: false, view: hidden(snapshot) };
    }

    const data = await this.dataFor(championId);
    const build = withOwnedOverlayItems(data.items, live.itemIds ?? []);
    this.trackLevelWindow(live);
    this.completed = skipMissedStartPick({
      ...live,
      completed: this.completed,
      watching: this.watching,
    });
    const offer = {
      ...live,
      completed: this.completed,
      watching: this.watching,
      secondsAtLevel: this.secondsAtLevel(live),
    };
    if (!shouldReadAugmentScreen(offer)) {
      this.resetOcr();
      return { snapshot, pinWindow: true, view: this.hud(snapshot, build) };
    }

    const cards = await this.readCards(snapshot, champion, data.augments, scheduledHunt(offer));
    const hunting = shouldReadAugmentScreen({
      ...live,
      completed: this.completed,
      watching: this.watching,
      secondsAtLevel: this.secondsAtLevel(live),
    });
    return {
      snapshot,
      pinWindow: true,
      view: this.seated(snapshot, build, cards, hunting),
    };
  }

  private hud(
    snapshot: StatsSnapshot | null,
    build: OverlayItem[],
    cards: OverlayView | null = null,
  ): OverlayView {
    const cardRows = cards?.cards ?? [];
    const notice = cards?.notice;
    return {
      visible: Boolean(notice || cardRows.length || build.length),
      champion: null,
      source: snapshot?.source ?? null,
      cards: cardRows,
      build: notice ? [] : build,
      notice,
      armCards: false,
    };
  }

  private seated(
    snapshot: StatsSnapshot | null,
    build: OverlayItem[],
    cards: OverlayView | null,
    hunting: boolean,
  ): OverlayView {
    const view = this.hud(snapshot, build, cards);
    if (!hunting) return view;
    return {
      ...view,
      visible: true,
      armCards: true,
    };
  }

  private async dataFor(
    championId: number | null,
  ): Promise<{ items: OverlayItem[]; augments: ChampionAugmentRow[] }> {
    if (!championId) return { items: [], augments: [] };
    if (this.champCache?.id === championId) return this.champCache;
    const items = await this.builds.itemsFor(championId);
    const augments = this.builds.augmentsFor ? await this.builds.augmentsFor(championId) : [];
    this.champCache = { id: championId, items, augments };
    return this.champCache;
  }

  private async readCards(
    snapshot: StatsSnapshot | null,
    champion: OverlayView["champion"],
    championAugments: ChampionAugmentRow[],
    scheduled: boolean,
  ): Promise<OverlayView> {
    const now = Date.now();
    const gap = this.watching ? WATCH_OCR_MS : OCR_HUNT_MS;
    if (this.huntBusy) return this.lastOcrView ?? idleView();
    if (this.lastOcrAt && now - this.lastOcrAt < gap && this.lastOcrView) {
      return this.lastOcrView;
    }
    this.huntBusy = true;
    try {
      const page = await this.screen.read();
      this.lastOcrAt = Date.now();
      return this.viewFromPage(snapshot, champion, championAugments, page, scheduled);
    } catch (error) {
      this.lastOcrAt = Date.now();
      this.say(`화면 읽기 실패: ${error instanceof Error ? error.message : "unknown"}`);
      return this.lastOcrView ?? idleView();
    } finally {
      this.huntBusy = false;
    }
  }

  private viewFromPage(
    snapshot: StatsSnapshot | null,
    champion: OverlayView["champion"],
    championAugments: ChampionAugmentRow[],
    page: ScreenPage,
    scheduled: boolean,
  ): OverlayView {
    const text = page.text ?? "";
    const titles = text.split(/\n+/).map((row) => row.trim()).filter(Boolean);
    const slots = Math.min(MAX_OFFER_CARDS, page.cardCount ?? 0);
    const names =
      snapshot && offerCardsVisible(slots) ? namesFromOcr(titles, snapshot.augments).slice(0, slots) : [];
    const resolved = resolveOverlay(snapshot, champion, names, championAugments);
    const cardsOn = resolved.cards.length >= 2;
    const view: OverlayView = {
      visible: cardsOn,
      champion: cardsOn ? champion : null,
      source: snapshot?.source ?? null,
      cards: resolved.cards,
      build: [],
    };

    if (cardsOn) {
      this.watching = true;
      this.misses = 0;
      this.frameMisses = 0;
      if (scheduled) this.countedOffer = true;
      this.lastOcrView = view;
      this.reportHunt(page, view);
      return view;
    }

    if (this.watching && this.lastOcrView?.cards.length) {
      if (pageUnreadable(page)) return this.lastOcrView;
      if (!offerCardsVisible(slots)) {
        this.frameMisses += 1;
        if (this.frameMisses < FRAME_MISS) return this.lastOcrView;
        this.finishWatching();
        this.lastOcrView = view;
        this.reportHunt(page, view);
        return view;
      }
      this.frameMisses = 0;
      this.misses += 1;
      if (this.misses < MISS_HIDE) return this.lastOcrView;
      this.finishWatching();
    }

    this.lastOcrView = view;
    this.reportHunt(page, view);
    return view;
  }

  private reportHunt(page: ScreenPage, view: OverlayView): void {
    if (view.cards.length) {
      const names = view.cards
        .map((card) => `${card.augment?.names.ko ?? card.query} ${card.augment?.grade ?? "?"}`)
        .join(", ");
      const raw = previewText(page.text);
      const missed = (page.cardCount ?? 0) > view.cards.length;
      this.say(missed ? `증강 등급 ${names} · OCR ${raw}` : `증강 등급 ${names}`);
      return;
    }
    const miss = offerMissNotice({
      hasWindow: page.hasWindow,
      text: page.text ?? "",
      cardCount: page.cardCount ?? 0,
      hint: page.hint,
    });
    if (miss) {
      this.say(`카드 ${page.cardCount ?? 0}장 · ${miss}`);
      return;
    }
    if (!page.hasWindow) {
      this.say("롤 창을 못 찾았습니다.");
      return;
    }
    this.say(`카드 틀 ${page.cardCount ?? 0}장 · 글자 ${previewText(page.text)}`);
  }

  private say(message: string): void {
    if (!message || message === this.lastLog) return;
    this.lastLog = message;
    this.logLine(message);
  }

  private finishWatching(): void {
    if (this.countedOffer) this.completed += 1;
    this.watching = false;
    this.misses = 0;
    this.frameMisses = 0;
    this.countedOffer = false;
    this.levelMarkTime = null;
    this.lastOcrView = null;
  }

  private trackLevelWindow(live: LiveGame): void {
    const next = MAYHEM_AUGMENT_LEVELS[this.completed];
    if (next == null || next === 3) {
      this.wasDead = live.isDead;
      this.lastLevel = live.level;
      return;
    }
    const leveledToPick = this.lastLevel > 0 && live.level > this.lastLevel && live.level >= next;
    const spawned = this.wasDead && !live.isDead && live.level >= next;
    if (live.level < next) {
      this.levelMarkTime = null;
    } else if (leveledToPick || spawned) {
      this.levelMarkTime = live.gameTime;
    }
    this.lastLevel = live.level;
    this.wasDead = live.isDead;
  }

  private secondsAtLevel(live: LiveGame): number | null {
    if (this.levelMarkTime == null) return null;
    return Math.max(0, live.gameTime - this.levelMarkTime);
  }

  private resetOcr(): void {
    this.lastOcrView = null;
    this.watching = false;
    this.misses = 0;
    this.frameMisses = 0;
    this.countedOffer = false;
    this.lastLog = "";
  }

  private resetMatch(): void {
    this.resetOcr();
    this.completed = 0;
    this.lastOcrAt = 0;
    this.wasDead = false;
    this.lastLevel = 0;
    this.levelMarkTime = null;
    this.champCache = null;
  }
}

function namesFromOcr(titles: string[], augments: StatsSnapshot["augments"]): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const title of titles) {
    const hit = matchAugment(title, augments);
    if (!hit || seen.has(hit.id)) continue;
    if (!isLikelyTitleSlotText(title, hit.names.ko) && !isLikelyTitleSlotText(title, hit.names.en)) continue;
    seen.add(hit.id);
    names.push(hit.names.ko);
    if (names.length >= MAX_OFFER_CARDS) return names;
  }
  return names;
}

function pageUnreadable(page: ScreenPage): boolean {
  return !page.hasWindow || page.hint === "no-capture";
}

function idleView(): OverlayView {
  return { visible: false, champion: null, source: null, cards: [], build: [] };
}

function previewText(text: string | undefined): string {
  const clipped = (text ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  return clipped || "없음";
}

function matchReady(live: LiveGame | null): live is LiveGame {
  if (!live) return false;
  if (live.started === false) return false;
  if (live.started === true) return true;
  return live.gameTime >= 1;
}

function scheduledHunt(offer: Parameters<typeof shouldReadAugmentScreen>[0]): boolean {
  return shouldReadAugmentScreen({ ...offer, watching: false });
}

function hidden(snapshot: StatsSnapshot | null): OverlayView {
  return {
    visible: false,
    champion: null,
    source: snapshot?.source ?? null,
    cards: [],
    build: [],
  };
}
