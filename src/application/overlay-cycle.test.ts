import { describe, expect, it } from "vitest";
import type { StatsSnapshot } from "../domain/augment";
import type { LeagueSession, LeagueReader, ScreenReader, StatsCache } from "./ports";
import { OverlayCycle } from "./overlay-cycle";

const snapshot: StatsSnapshot = {
  patch: "26.23",
  source: "aramgg",
  syncedAt: "2026-11-24T00:00:00.000Z",
  attribution: "test",
  champions: [
    {
      id: 157,
      key: "Yasuo",
      names: { ko: "야스오", en: "Yasuo" },
      title: "",
      iconUrl: null,
      grade: "A",
      pickRate: 12,
      winRate: null,
    },
  ],
  augments: [],
};

class MemoryCache implements StatsCache {
  constructor(private snapshot: StatsSnapshot | null) {}
  async read(): Promise<StatsSnapshot | null> {
    return this.snapshot;
  }
  async write(next: StatsSnapshot): Promise<void> {
    this.snapshot = next;
  }
}

class FixedLeague implements LeagueReader {
  constructor(private session: LeagueSession | null) {}
  async readSession(): Promise<LeagueSession | null> {
    return this.session;
  }
}

class RecordingScreen implements ScreenReader {
  called = false;
  async readCardTitles(): Promise<string[]> {
    this.called = true;
    return ["벌이다!!!", "유레카"];
  }
}

describe("OverlayCycle", () => {
  it("shows the champion grade in champ select without OCR", async () => {
    const screen = new RecordingScreen();
    const cycle = new OverlayCycle(
      new MemoryCache(snapshot),
      new FixedLeague({ phase: "ChampSelect", championId: 157, championName: null }),
      screen,
    );

    const { view } = await cycle.tick();
    expect(view.visible).toBe(true);
    expect(view.champion).toEqual({ name: "야스오", grade: "A" });
    expect(view.cards).toEqual([]);
    expect(screen.called).toBe(false);
  });

  it("hides while sitting in lobby", async () => {
    const cycle = new OverlayCycle(
      new MemoryCache(snapshot),
      new FixedLeague({ phase: "Lobby", championId: null, championName: null }),
      new RecordingScreen(),
    );

    const { view } = await cycle.tick();
    expect(view.visible).toBe(false);
  });
});
