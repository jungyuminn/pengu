import { describe, expect, it } from "vitest";
import { EnsureOverlayWindowMode } from "./ensure-overlay-window-mode";
import type { LeagueWindowModeStore } from "./ports";

class MemoryMode implements LeagueWindowModeStore {
  constructor(public mode: number | null) {}
  async read(): Promise<number | null> {
    return this.mode;
  }
  async write(mode: number): Promise<void> {
    this.mode = mode;
  }
}

describe("EnsureOverlayWindowMode", () => {
  it("switches fullscreen to borderless", async () => {
    const store = new MemoryMode(0);
    const logs: string[] = [];
    await new EnsureOverlayWindowMode(store, (line) => logs.push(line)).ensure();
    expect(store.mode).toBe(2);
    expect(logs).toEqual(["전체화면을 테두리 없는 창으로 맞췄습니다"]);
  });

  it("logs when the store cannot write fullscreen away", async () => {
    const logs: string[] = [];
    const store: LeagueWindowModeStore = {
      read: async () => 0,
      write: async () => {
        throw new Error("denied");
      },
    };
    await new EnsureOverlayWindowMode(store, (line) => logs.push(line)).ensure();
    expect(logs).toEqual(["롤 전체화면을 테두리 없는 창으로 못 바꿨습니다"]);
  });

  it("leaves windowed and borderless alone", async () => {
    const windowed = new MemoryMode(1);
    await new EnsureOverlayWindowMode(windowed).ensure();
    expect(windowed.mode).toBe(1);

    const borderless = new MemoryMode(2);
    await new EnsureOverlayWindowMode(borderless).ensure();
    expect(borderless.mode).toBe(2);
  });
});
