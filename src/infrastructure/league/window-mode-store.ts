import type { LeagueWindowModeStore } from "../../application/ports";
import { GameCfgWindowMode } from "./game-cfg-window-mode";
import { LcuWindowModeSettings } from "../lcu/window-mode-settings";

export class CombinedLeagueWindowModeStore implements LeagueWindowModeStore {
  constructor(
    private readonly live = new LcuWindowModeSettings(),
    private readonly file = new GameCfgWindowMode(),
  ) {}

  async read(): Promise<number | null> {
    const fromLive = await this.live.read().catch(() => null);
    if (fromLive != null) return fromLive;
    return this.file.read();
  }

  async write(mode: number): Promise<void> {
    const live = await this.live.write(mode).catch(() => false);
    const file = await this.file.write(mode).catch(() => false);
    if (live || file) return;
    throw new Error("롤 창 모드를 못 바꿨습니다.");
  }
}
