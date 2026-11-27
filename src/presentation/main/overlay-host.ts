import type { BrowserWindow } from "electron";
import type { OverlayView } from "../../domain/augment";
import { overlayFitKind, type OverlayFitKind } from "../../domain/overlay-fit";
import { leagueClientBox, leagueClientFocused } from "../../infrastructure/ocr/league-window";
import { emptyOverlay } from "./app-state";
import { waitUntilReady } from "./splash";
import { createOverlayWindow, fitOverlayToGame } from "./windows";

type Pane = {
  window: BrowserWindow;
  shown: boolean;
  sig: string;
};

export class OverlayHost {
  private readonly cards: Pane;
  private readonly build: Pane;

  constructor() {
    this.cards = pane();
    this.build = pane();
  }

  ready(): Promise<void> {
    return Promise.all([waitUntilReady(this.cards.window), waitUntilReady(this.build.window)]).then(
      () => undefined,
    );
  }

  async show(view: OverlayView, enabled: boolean, force = false): Promise<void> {
    const next = enabled ? view : emptyOverlay();
    const onGame = force || !leagueClientBox() || leagueClientFocused();
    const live = enabled && onGame;
    await Promise.all([
      paint(
        this.cards,
        {
          ...next,
          build: [],
          visible:
            live &&
            (Boolean(next.armCards) ||
              next.cards.length > 0 ||
              Boolean(next.notice) ||
              Boolean(next.champion)),
        },
        overlayFitKind({ ...next, build: [] }),
      ),
      paint(
        this.build,
        {
          ...next,
          cards: [],
          armCards: false,
          notice: undefined,
          visible: live && next.build.length > 0,
        },
        "build",
      ),
    ]);
  }
}

function pane(): Pane {
  return { window: createOverlayWindow(), shown: false, sig: "" };
}

async function paint(pane: Pane, view: OverlayView, kind: OverlayFitKind): Promise<void> {
  if (!view.visible) {
    pane.shown = false;
    pane.sig = "";
    if (pane.window.isVisible()) pane.window.hide();
    return;
  }
  await fitOverlayToGame(pane.window, kind);
  const sig = overlaySig(view);
  if (sig !== pane.sig) {
    pane.window.webContents.send("pengu:overlay", view);
    pane.sig = sig;
  }
  if (pane.shown) return;
  pane.window.showInactive();
  pane.window.setIgnoreMouseEvents(true);
  pane.window.setAlwaysOnTop(true, "screen-saver");
  pane.window.moveTop();
  pane.shown = true;
}

function overlaySig(view: OverlayView): string {
  return JSON.stringify({
    visible: view.visible,
    armCards: Boolean(view.armCards),
    notice: view.notice ?? "",
    champion: view.champion ? [view.champion.name, view.champion.grade] : null,
    cards: view.cards.map((card) => [
      card.slot,
      card.augment?.id,
      card.augment?.grade,
      card.augment?.names.ko,
      card.catalogRank,
      card.catalogTotal,
    ]),
    build: view.build.map((item) => [item.name, item.id ?? null, Boolean(item.owned)]),
  });
}
