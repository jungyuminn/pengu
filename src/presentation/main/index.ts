import { execSync } from "child_process";
import { app, globalShortcut, ipcMain } from "electron";

if (process.platform === "win32") {
  try {
    execSync("chcp 65001", { stdio: "ignore", windowsHide: true });
  } catch {
    /* ignore */
  }
}
import { resolveApiKey } from "../../application/api-key";
import { dataRefreshLabel } from "../../application/data-refresh-label";
import { championBuildLabel, matchHistoryLabel, statsSyncLabel } from "../../application/sync-progress";
import { resolveOverlay } from "../../application/resolve-overlay";
import type { AppSettings } from "../../application/ports";
import { asThemeMode, windowBackground } from "../../domain/theme";
import type { OverlayView } from "../../domain/augment";
import { championTiers } from "../../application/champion-tiers";
import { buildHomeFeed } from "../../application/home-feed";
import { matchStatsFit, type MatchFitPlayer } from "../../application/match-stats-fit";
import { playingChampionId } from "../../application/playing-champion";
import { createComposition } from "./composition";
import { emptyOverlay, type UiState } from "./app-state";
import { registerWindowChrome } from "./window-chrome";
import { createSplashWindow, revealMainWindow, waitUntilReady } from "./splash";
import { OverlayHost } from "./overlay-host";
import { createSettingsWindow } from "./windows";
import {
  bindSettingsHideOnClose,
  createAppTray,
  destroyAppTray,
  showSettingsWindow,
  watchAppQuit,
} from "./app-tray";

app.setName("Pengu");
app.setAppUserModelId("Pengu");
app.commandLine.appendSwitch("enable-transparent-visuals");
app.commandLine.appendSwitch("enable-logging");

let overlayTimer: NodeJS.Timeout | undefined;
let lastMessage = "";
let stopScreen: (() => void) | undefined;
let settingsWindowRef: ReturnType<typeof createSettingsWindow> | undefined;

watchAppQuit();

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (settingsWindowRef) showSettingsWindow(settingsWindowRef);
  });
  void app.whenReady().then(async () => {
  const startedAt = Date.now();
  const splash = createSplashWindow();
  registerWindowChrome();
  const services = createComposition(app.getPath("userData"));
  stopScreen = () => services.screen.stop();
  void services.screen.warm();
  const bootSettings = await services.settings.read();
  const settingsWindow = createSettingsWindow(bootSettings.theme);
  settingsWindowRef = settingsWindow;
  bindSettingsHideOnClose(settingsWindow);
  const overlay = new OverlayHost();
  const settingsReady = waitUntilReady(settingsWindow);
  const overlayReady = overlay.ready();

  const pushState = async (message?: string): Promise<UiState> => {
    if (message !== undefined) lastMessage = message;
    const settings = await services.settings.read();
    const snapshot = await services.cache.read();
    const session = await services.league.readSession();
    const apiKey = resolveApiKey(settings.apiKey, services.bundledKey);
    const [profile, augmentIcons, augmentTexts, itemIcons, spellIcons, gear] = await Promise.all([
      services.mayhemStore.readActive(),
      services.augmentIcons.fetch(),
      services.augmentDescriptions.fetch(),
      services.itemIcons.fetch(),
      services.spellIcons.fetch(),
      services.gearNames.fetch(),
    ]);
    const state: UiState = {
      settings,
      snapshot,
      overlay: emptyOverlay(),
      leagueConnected: Boolean(session),
      usingBuiltinKey: Boolean(apiKey) && !settings.apiKey.trim(),
      message: lastMessage,
      tiers: championTiers(snapshot?.champions ?? []),
      home: buildHomeFeed(
        snapshot,
        profile,
        augmentIcons,
        augmentTexts,
        itemIcons,
        spellIcons,
        gear.itemById,
        gear.itemTextById,
      ),
    };
    settingsWindow.webContents.send("pengu:state", state);
    return state;
  };

  const refreshMayhem = async (forceDeep = false): Promise<void> => {
    try {
      await services.syncMayhem.execute(forceDeep);
    } catch {
      return;
    }
    await pushState();
  };

  const showOverlay = (view: OverlayView, enabled: boolean, force = false): Promise<void> =>
    overlay.show(view, enabled, force);

  const tick = async (): Promise<void> => {
    const settings = await services.settings.read();
    if (!settings.overlayEnabled) {
      await showOverlay(emptyOverlay(), false);
      return;
    }
    await services.overlayWindowMode.ensure();
    const { view } = await services.overlayCycle.tick();
    await showOverlay(view, true);
  };

  let lastPlayingId: number | null | undefined;
  const pushPlayingChampion = async (): Promise<void> => {
    if (settingsWindow.isDestroyed()) return;
    const session = await services.league.readSession();
    const live =
      !session || session.phase === "InProgress" || session.phase === "GameStart"
        ? await services.liveGame.read()
        : null;
    const snapshot = await services.cache.read();
    const id = playingChampionId(session, live, snapshot?.champions ?? []);
    if (id === lastPlayingId) return;
    lastPlayingId = id;
    settingsWindow.webContents.send("pengu:playing", id);
  };

  const say = (message: string): void => {
    lastMessage = message;
    if (!settingsWindow.isDestroyed()) {
      settingsWindow.webContents.send("pengu:message", message);
    }
  };

  const runSync = async (force: boolean, deepMayhem = false): Promise<UiState> => {
    const settings = await services.settings.read();
    const apiKey = resolveApiKey(settings.apiKey, services.bundledKey);
    if (!apiKey) {
      return pushState("내장 통계 키가 없습니다.");
    }
    say(statsSyncLabel());
    const result = await services.createSync(apiKey).execute(force);
    await services.hydrate.execute((done, total) => say(championBuildLabel(done, total)), force);
    say(matchHistoryLabel());
    await refreshMayhem(force || deepMayhem);
    return pushState(dataRefreshLabel(result.snapshot.syncedAt, result.snapshot.patch));
  };

  ipcMain.handle("pengu:get-state", () => pushState());
  ipcMain.handle("pengu:sync", async () => {
    try {
      return await runSync(true, true);
    } catch (error) {
      return pushState(error instanceof Error ? error.message : "통계 동기화에 실패했습니다.");
    }
  });
  ipcMain.handle("pengu:save-api-key", async (_event, apiKey: string) => {
    const current = await services.settings.read();
    const next: AppSettings = { ...current, apiKey };
    await services.settings.write(next);
    return pushState("API 키를 저장했습니다.");
  });
  ipcMain.handle("pengu:toggle-overlay", async (_event, overlayEnabled: boolean) => {
    const current = await services.settings.read();
    await services.settings.write({ ...current, overlayEnabled });
    if (!overlayEnabled) await showOverlay(emptyOverlay(), false);
    else await services.overlayWindowMode.ensure();
    return pushState(overlayEnabled ? "증강 오버레이를 켰습니다." : "증강 오버레이를 껐습니다.");
  });
  ipcMain.handle("pengu:set-theme", async (_event, theme: string) => {
    const current = await services.settings.read();
    const next = asThemeMode(theme);
    await services.settings.write({ ...current, theme: next });
    settingsWindow.setBackgroundColor(windowBackground(next));
    return pushState();
  });
  ipcMain.handle("pengu:champion-detail", async (_event, championId: number) => {
    return services.loadChampionDetail.execute(Number(championId));
  });
  ipcMain.handle("pengu:match-fits", async (_event, players: MatchFitPlayer[]) => {
    const rows = Array.isArray(players) ? players : [];
    const ids = [...new Set(rows.map((row) => Number(row.championId)).filter((id) => id > 0))];
    const details = new Map(
      await Promise.all(
        ids.map(async (id) => [id, await services.loadChampionDetail.execute(id)] as const),
      ),
    );
    return matchStatsFit(rows, details);
  });
  ipcMain.handle("pengu:preview", async () => {
    const snapshot = await services.cache.read();
    const samples = snapshot?.augments.slice(0, 3).map((item) => item.names.ko) ?? [
      "벌이다!!!",
      "유레카",
      "탱크 엔진",
    ];
    const sampleChampion = snapshot?.champions[0]
      ? { name: snapshot.champions[0].names.ko, grade: snapshot.champions[0].grade }
      : { name: "탐 켄치", grade: "S" as const };
    const view = resolveOverlay(snapshot, sampleChampion, samples);
    await showOverlay(
      {
        ...view,
        visible: true,
        champion: view.champion ?? sampleChampion,
        cards: view.cards.length
          ? view.cards
          : samples.map((query, slot) => ({
              slot,
              query,
              augment: null,
              catalogRank: null,
              catalogTotal: null,
              advice: null,
            })),
      },
      true,
      true,
    );
    setTimeout(() => {
      void tick();
    }, 4000);
    return pushState("테스트 증강 오버레이를 4초 동안 띄웁니다.");
  });

  const boundToggle = globalShortcut.register("CommandOrControl+Shift+P", async () => {
    const current = await services.settings.read();
    await services.settings.write({ ...current, overlayEnabled: !current.overlayEnabled });
    await pushState();
  });
  if (!boundToggle) {
    lastMessage = "Ctrl+Shift+P 단축키를 등록하지 못했습니다.";
  }

  await settingsReady;
  await overlayReady;
  await pushState(statsSyncLabel());
  await revealMainWindow(splash, settingsWindow, startedAt);
  createAppTray(settingsWindow);
  void services.championCatalog.warm();
  void services.gearNames.fetch();
  void services.augmentIcons.fetch();
  try {
    await runSync(false, true);
  } catch (error) {
    await pushState(error instanceof Error ? error.message : "통계 동기화에 실패했습니다.");
  }

  let homeTicks = 0;
  let tickBusy = false;
  void pushPlayingChampion();
  overlayTimer = setInterval(() => {
    if (tickBusy) return;
    tickBusy = true;
    void (async () => {
      try {
        await tick();
        homeTicks += 1;
        if (homeTicks % 3 === 1) await pushPlayingChampion();
        if (homeTicks % 250 !== 0) return;
        const session = await services.league.readSession();
        if (session?.phase === "InProgress" || session?.phase === "GameStart") return;
        await refreshMayhem(false);
      } finally {
        tickBusy = false;
      }
    })();
  }, 120);
  });
}

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  stopScreen?.();
  destroyAppTray();
  if (overlayTimer) clearInterval(overlayTimer);
});

