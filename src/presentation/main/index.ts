import { app, globalShortcut, ipcMain } from "electron";
import { resolveApiKey } from "../../application/api-key";
import { resolveOverlay } from "../../application/resolve-overlay";
import type { AppSettings } from "../../application/ports";
import { asThemeMode, windowBackground } from "../../domain/theme";
import type { OverlayView } from "../../domain/augment";
import { championTiers } from "../../application/champion-tiers";
import { createComposition } from "./composition";
import { emptyOverlay, type UiState } from "./app-state";
import { registerWindowChrome } from "./window-chrome";
import { createOverlayWindow, createSettingsWindow } from "./windows";

app.setName("Pengu");
app.setAppUserModelId("Pengu");

let overlayTimer: NodeJS.Timeout | undefined;

void app.whenReady().then(async () => {
  registerWindowChrome();
  const services = createComposition(app.getPath("userData"));
  const bootSettings = await services.settings.read();
  const settingsWindow = createSettingsWindow(bootSettings.theme);
  const overlayWindow = createOverlayWindow();

  const pushState = async (message = ""): Promise<UiState> => {
    const settings = await services.settings.read();
    const snapshot = await services.cache.read();
    const session = await services.league.readSession();
    const apiKey = resolveApiKey(settings.apiKey, services.bundledKey);
    const state: UiState = {
      settings,
      snapshot,
      overlay: emptyOverlay(),
      leagueConnected: Boolean(session),
      usingBuiltinKey: Boolean(apiKey) && !settings.apiKey.trim(),
      message,
      tiers: championTiers(snapshot?.champions ?? []),
    };
    settingsWindow.webContents.send("pengu:state", state);
    return state;
  };

  const showOverlay = (view: OverlayView, enabled: boolean): void => {
    overlayWindow.webContents.send("pengu:overlay", enabled ? view : emptyOverlay());
  };

  const tick = async (): Promise<void> => {
    const settings = await services.settings.read();
    if (!settings.overlayEnabled) {
      showOverlay(emptyOverlay(), false);
      return;
    }
    const { view } = await services.overlayCycle.tick();
    showOverlay(view, true);
  };

  const runSync = async (force: boolean): Promise<UiState> => {
    const settings = await services.settings.read();
    const apiKey = resolveApiKey(settings.apiKey, services.bundledKey);
    if (!apiKey) {
      return pushState("내장 통계 키가 없습니다.");
    }
    const result = await services.createSync(apiKey).execute(force);
    void services.hydrate.execute();
    if (result.skipped) {
      return pushState(`오늘 받은 캐시를 씁니다. 패치 ${result.snapshot.patch}`);
    }
    return pushState(`aramgg 데이터를 받았습니다. 패치 ${result.snapshot.patch}`);
  };

  ipcMain.handle("pengu:get-state", () => pushState());
  ipcMain.handle("pengu:save-api-key", async (_event, apiKey: string) => {
    const current = await services.settings.read();
    const next: AppSettings = { ...current, apiKey };
    await services.settings.write(next);
    return pushState("API 키를 저장했습니다.");
  });
  ipcMain.handle("pengu:sync", async () => {
    return runSync(true);
  });
  ipcMain.handle("pengu:toggle-overlay", async (_event, overlayEnabled: boolean) => {
    const current = await services.settings.read();
    await services.settings.write({ ...current, overlayEnabled });
    if (!overlayEnabled) showOverlay(emptyOverlay(), false);
    return pushState(overlayEnabled ? "오버레이를 켰습니다." : "오버레이를 껐습니다.");
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
    showOverlay(
      {
        ...view,
        visible: true,
        champion: view.champion ?? sampleChampion,
        cards: view.cards.length
          ? view.cards
          : samples.map((query, slot) => ({ slot, query, augment: null })),
      },
      true,
    );
    setTimeout(() => {
      void tick();
    }, 4000);
    return pushState("테스트 오버레이를 4초 동안 띄웁니다.");
  });

  globalShortcut.register("CommandOrControl+Shift+P", async () => {
    const current = await services.settings.read();
    await services.settings.write({ ...current, overlayEnabled: !current.overlayEnabled });
    await pushState();
  });

  await pushState("통계를 불러오는 중...");
  void services.championCatalog.warm();
  void services.gearNames.fetch();
  void services.augmentIcons.fetch();
  try {
    await runSync(false);
  } catch (error) {
    await pushState(error instanceof Error ? error.message : "통계 동기화에 실패했습니다.");
  }

  overlayTimer = setInterval(() => {
    void tick();
  }, 1500);
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (overlayTimer) clearInterval(overlayTimer);
});
