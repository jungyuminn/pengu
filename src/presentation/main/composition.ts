import path from "path";
import { SyncStats } from "../../application/sync-stats";
import { OverlayCycle } from "../../application/overlay-cycle";
import { EnsureOverlayWindowMode } from "../../application/ensure-overlay-window-mode";
import { ChampionOverlayBuilds } from "../../application/champion-overlay-builds";
import { HydrateChampionDetails } from "../../application/hydrate-champion-details";
import { LoadChampionDetail } from "../../application/load-champion-detail";
import { PolishedChampionIconCache } from "../../application/polished-champion-icon-cache";
import { SyncMayhemHistory } from "../../application/sync-mayhem-history";
import { AramggCatalog } from "../../infrastructure/aramgg/client";
import { AramggChampionDetails } from "../../infrastructure/aramgg/detail-client";
import { fetchChampionIndex } from "../../infrastructure/champions/ddragon";
import { BundledChampionIcons } from "../../infrastructure/champions/bundled-icons";
import { BundledAugmentDescriptions } from "../../infrastructure/augments/bundled-descriptions";
import { BundledAugmentIcons } from "../../infrastructure/augments/bundled-icons";
import { BundledSkillIcons } from "../../infrastructure/skills/bundled-icons";
import { BundledItemIcons } from "../../infrastructure/items/bundled-icons";
import { BundledSpellIcons } from "../../infrastructure/spells/bundled-icons";
import { DDragonGearNames } from "../../infrastructure/ddragon/gear-names";
import { FileChampionDetailCache } from "../../infrastructure/cache/champion-detail-cache";
import { FileMayhemHistoryStore } from "../../infrastructure/cache/mayhem-history-cache";
import { FileStatsCache } from "../../infrastructure/cache/file-cache";
import { LcuLeagueReader } from "../../infrastructure/lcu/client";
import { LcuMayhemHistory } from "../../infrastructure/lcu/mayhem-history";
import { LiveClientReader } from "../../infrastructure/live-client/client";
import { OcrScreenReader } from "../../infrastructure/ocr/screen-reader";
import { FileSettingsStore } from "../../infrastructure/settings/file-settings";
import { readBundledKey } from "../../infrastructure/aramgg/bundled-key";
import { CombinedLeagueWindowModeStore } from "../../infrastructure/league/window-mode-store";
import { createHuntLogger } from "./hunt-log";

export function createComposition(userData: string) {
  const appRoot = path.join(__dirname, "../..");
  const championPortraits = new BundledChampionIcons();
  const cache = new PolishedChampionIconCache(
    new FileStatsCache(path.join(userData, "stats.json")),
    championPortraits,
  );
  const championDetails = new FileChampionDetailCache(path.join(userData, "champions"));
  const mayhemStore = new FileMayhemHistoryStore(path.join(userData, "mayhem"));
  const syncMayhem = new SyncMayhemHistory(new LcuMayhemHistory(), mayhemStore);
  const settings = new FileSettingsStore(path.join(userData, "settings.json"));
  const league = new LcuLeagueReader();
  const bundledKey = readBundledKey(appRoot);
  const huntLog = createHuntLogger(userData);
  const screen = new OcrScreenReader(path.join(userData, "ocr-models"));
  const liveGame = new LiveClientReader();
  const championCatalog = new AramggChampionDetails();
  const gearNames = new DDragonGearNames();
  const augmentIcons = new BundledAugmentIcons();
  const augmentDescriptions = new BundledAugmentDescriptions();
  const skillIcons = new BundledSkillIcons();
  const spellIcons = new BundledSpellIcons();
  const itemIcons = new BundledItemIcons();
  const loadChampionDetail = new LoadChampionDetail(
    championCatalog,
    championDetails,
    cache,
    gearNames,
    augmentIcons,
    skillIcons,
    spellIcons,
    itemIcons,
    augmentDescriptions,
  );

  return {
    cache,
    settings,
    bundledKey,
    league,
    mayhemStore,
    syncMayhem,
    screen,
    overlayCycle: new OverlayCycle(
      cache,
      league,
      screen,
      liveGame,
      new ChampionOverlayBuilds(loadChampionDetail),
      huntLog,
    ),
    overlayWindowMode: new EnsureOverlayWindowMode(new CombinedLeagueWindowModeStore(), huntLog),
    liveGame,
    championCatalog,
    gearNames,
    augmentIcons,
    augmentDescriptions,
    itemIcons,
    spellIcons,
    loadChampionDetail,
    hydrate: new HydrateChampionDetails(
      championCatalog,
      championDetails,
      cache,
      gearNames,
      augmentIcons,
      skillIcons,
      spellIcons,
      itemIcons,
      augmentDescriptions,
    ),
    createSync(apiKey: string) {
      return new SyncStats(new AramggCatalog(apiKey), cache, { fetch: fetchChampionIndex });
    },
  };
}
