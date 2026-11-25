import { overlayWindowMode } from "../domain/league-window-mode";
import type { LeagueWindowModeStore } from "./ports";

const RETRY_MS = 3000;

export class EnsureOverlayWindowMode {
  private nextAt = 0;
  private lastLog = "";

  constructor(
    private readonly store: LeagueWindowModeStore,
    private readonly logLine: (message: string) => void = () => undefined,
  ) {}

  async ensure(): Promise<void> {
    if (Date.now() < this.nextAt) return;
    this.nextAt = Date.now() + RETRY_MS;
    try {
      const current = await this.store.read();
      const next = overlayWindowMode(current);
      if (next == null) return;
      await this.store.write(next);
      this.say("전체화면을 테두리 없는 창으로 맞췄습니다");
    } catch {
      this.say("롤 전체화면을 테두리 없는 창으로 못 바꿨습니다");
    }
  }

  private say(message: string): void {
    if (message === this.lastLog) return;
    this.lastLog = message;
    this.logLine(message);
  }
}
