import { describe, expect, it } from "vitest";
import type { StatsSnapshot } from "../domain/augment";
import type { LeagueSession, LeagueReader, LiveGame, LiveGameReader, ScreenReader, StatsCache } from "./ports";
import { OverlayCycle } from "./overlay-cycle";

const withAugments: StatsSnapshot = {
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
  augments: [
    {
      id: "bees",
      numericId: null,
      names: { ko: "벌이다!!!", en: "BEES!!!" },
      rarity: "gold",
      grade: "S",
      pickRate: 49,
      sample: null,
    },
    {
      id: "eureka",
      numericId: null,
      names: { ko: "유레카", en: "Eureka" },
      rarity: "prismatic",
      grade: "A",
      pickRate: 40,
      sample: null,
    },
  ],
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

class FixedLive implements LiveGameReader {
  constructor(private game: LiveGame | null) {}
  async read(): Promise<LiveGame | null> {
    return this.game;
  }
}

class RecordingScreen implements ScreenReader {
  calls = 0;
  titles = ["유레카 벌이다!!!"];
  cardCount = 0;
  hint = "";
  async read(): Promise<{ hasWindow: boolean; text: string; cardCount: number; hint: string }> {
    this.calls += 1;
    return { hasWindow: true, text: this.titles.join(" "), cardCount: this.cardCount, hint: this.hint };
  }
}

describe("OverlayCycle", () => {
  it("hides the item build in champ select", async () => {
    const screen = new RecordingScreen();
    const cycle = new OverlayCycle(
      new MemoryCache(withAugments),
      new FixedLeague({ phase: "ChampSelect", championId: 157, championName: null }),
      screen,
      { read: async () => null },
      { itemsFor: async () => [{ name: "삼위일체", iconUrl: "trinity.png" }] },
    );

    const { view } = await cycle.tick();
    expect(view.visible).toBe(false);
    expect(view.build).toEqual([]);
    expect(screen.calls).toBe(0);
  });

  it("shows the core build when Pengu starts in an already running game", async () => {
    const screen = new RecordingScreen();
    const cycle = new OverlayCycle(
      new MemoryCache(withAugments),
      new FixedLeague({ phase: "InProgress", championId: null, championName: null }),
      screen,
      new FixedLive({ gameTime: 180, level: 8, isDead: false, championName: "Yasuo" }),
      { itemsFor: async (id) => (id === 157 ? [{ name: "삼위일체", iconUrl: "trinity.png" }] : []) },
    );

    const { view } = await cycle.tick();
    expect(view.visible).toBe(true);
    expect(view.champion).toBeNull();
    expect(view.build.map((item) => item.name)).toEqual(["삼위일체"]);
    expect(screen.calls).toBe(1);
  });

  it("looks at the screen during a fight so an augment offer can appear", async () => {
    const screen = new RecordingScreen();
    screen.titles = [];
    const cycle = new OverlayCycle(
      new MemoryCache(withAugments),
      new FixedLeague({ phase: "InProgress", championId: 157, championName: null }),
      screen,
      new FixedLive({ gameTime: 200, level: 6, isDead: false }),
      { itemsFor: async () => [{ name: "삼위일체", iconUrl: "trinity.png" }] },
    );
    cycle["completed"] = 1;

    const { view } = await cycle.tick();
    expect(view.build.map((item) => item.name)).toEqual(["삼위일체"]);
    expect(screen.calls).toBe(1);
  });

  it("keeps looking for a pick screen after the usual four augments", async () => {
    const screen = new RecordingScreen();
    const cycle = new OverlayCycle(
      new MemoryCache(withAugments),
      new FixedLeague({ phase: "InProgress", championId: 157, championName: null }),
      screen,
      new FixedLive({ gameTime: 400, level: 16, isDead: false }),
      { itemsFor: async () => [{ name: "삼위일체", iconUrl: "trinity.png" }] },
    );
    cycle["completed"] = 4;

    const { view } = await cycle.tick();
    expect(view.visible).toBe(true);
    expect(view.build.map((item) => item.name)).toEqual(["삼위일체"]);
    expect(screen.calls).toBe(1);
  });

  it("does not grade fight HUD text as augment cards", async () => {
    const screen = new RecordingScreen();
    screen.titles = [
      "생피언 드 러 페 포 卜 보조 피 하 량 무리한 진입 사그 조 주 74 DI 는 卜",
    ];
    const cycle = new OverlayCycle(
      new MemoryCache({
        ...withAugments,
        augments: [
          ...withAugments.augments,
          {
            id: "over",
            numericId: null,
            names: { ko: "무리한 진입", en: "Overextender" },
            rarity: "gold",
            grade: "A",
            pickRate: 20,
            sample: null,
          },
        ],
      }),
      new FixedLeague({ phase: "InProgress", championId: 157, championName: null }),
      screen,
      new FixedLive({ gameTime: 12, level: 3, isDead: false }),
    );

    const { view } = await cycle.tick();
    expect(view.cards).toEqual([]);
  });

  it("reads cards at the opening pick", async () => {
    const screen = new RecordingScreen();
    screen.cardCount = 3;
    const cycle = new OverlayCycle(
      new MemoryCache(withAugments),
      new FixedLeague({ phase: "InProgress", championId: 157, championName: null }),
      screen,
      new FixedLive({ gameTime: 12, level: 3, isDead: false }),
    );

    const { view } = await cycle.tick();
    expect(screen.calls).toBe(1);
    expect(view.cards.map((card) => card.augment?.id)).toEqual(["eureka", "bees"]);
  });

  it("reads later picks while dead", async () => {
    const screen = new RecordingScreen();
    screen.cardCount = 3;
    const cycle = new OverlayCycle(
      new MemoryCache(withAugments),
      new FixedLeague({ phase: "InProgress", championId: 157, championName: null }),
      screen,
      new FixedLive({ gameTime: 200, level: 6, isDead: true }),
    );
    cycle["completed"] = 1;

    const { view } = await cycle.tick();
    expect(screen.calls).toBe(1);
    expect(view.visible).toBe(true);
  });

  it("keeps reading after the first hit so a reroll can change grades", async () => {
    const screen = new RecordingScreen();
    screen.cardCount = 3;
    const cycle = new OverlayCycle(
      new MemoryCache(withAugments),
      new FixedLeague({ phase: "InProgress", championId: 157, championName: null }),
      screen,
      new FixedLive({ gameTime: 12, level: 3, isDead: false }),
    );

    const first = await cycle.tick();
    expect(first.view.cards.map((card) => card.augment?.id)).toEqual(["eureka", "bees"]);
    cycle["lastOcrAt"] = 0;
    screen.titles = ["벌이다!!! 유레카"];
    const reroll = await cycle.tick();
    expect(screen.calls).toBe(2);
    expect(reroll.view.cards.map((card) => card.augment?.id)).toEqual(["bees", "eureka"]);
  });

  it("does not turn card descriptions into extra grade slots", async () => {
    const screen = new RecordingScreen();
    screen.cardCount = 3;
    screen.titles = ["유레카\n벌이다!!!\n탱크 엔진\n부유약을 얻습니다"];
    const cycle = new OverlayCycle(
      new MemoryCache({
        ...withAugments,
        augments: [
          ...withAugments.augments,
          {
            id: "engine",
            numericId: null,
            names: { ko: "탱크 엔진", en: "The Tank Engine" },
            rarity: "gold",
            grade: "B",
            pickRate: 30,
            sample: null,
          },
          {
            id: "potion",
            numericId: null,
            names: { ko: "부유약", en: "Potion of Madre" },
            rarity: "gold",
            grade: "C",
            pickRate: 10,
            sample: null,
          },
        ],
      }),
      new FixedLeague({ phase: "InProgress", championId: 157, championName: null }),
      screen,
      new FixedLive({ gameTime: 12, level: 3, isDead: false }),
    );

    const { view } = await cycle.tick();
    expect(view.cards.map((card) => card.augment?.id)).toEqual(["eureka", "bees", "engine"]);
  });

  it("does not read the loading screen after live data appears", async () => {
    const screen = new RecordingScreen();
    screen.cardCount = 3;
    const cycle = new OverlayCycle(
      new MemoryCache(withAugments),
      new FixedLeague({ phase: "InProgress", championId: 157, championName: null }),
      screen,
      new FixedLive({ gameTime: 0, level: 3, isDead: false, started: false }),
      { itemsFor: async () => [{ name: "삼위일체", iconUrl: "trinity.png" }] },
    );

    const { view } = await cycle.tick();
    expect(screen.calls).toBe(0);
    expect(view.visible).toBe(false);
    expect(view.cards).toEqual([]);
  });

  it("hides the overlay on the game loading screen", async () => {
    const screen = new RecordingScreen();
    const cycle = new OverlayCycle(
      new MemoryCache(withAugments),
      new FixedLeague({ phase: "GameStart", championId: 157, championName: null }),
      screen,
      { read: async () => null },
      { itemsFor: async () => [{ name: "삼위일체", iconUrl: "trinity.png" }] },
    );

    const { view } = await cycle.tick();
    expect(view.visible).toBe(false);
    expect(view.cards).toEqual([]);
    expect(view.build).toEqual([]);
    expect(screen.calls).toBe(0);
  });

  it("reads the opening pick while LCU is still on GameStart", async () => {
    const screen = new RecordingScreen();
    screen.cardCount = 3;
    const cycle = new OverlayCycle(
      new MemoryCache(withAugments),
      new FixedLeague({ phase: "GameStart", championId: 157, championName: null }),
      screen,
      new FixedLive({ gameTime: 8, level: 3, isDead: false, started: true }),
    );

    const { view } = await cycle.tick();
    expect(screen.calls).toBe(1);
    expect(view.cards.map((card) => card.augment?.id)).toEqual(["eureka", "bees"]);
  });

  it("puts the playing champion's aramgg grade on the overlay", async () => {
    const screen = new RecordingScreen();
    screen.cardCount = 3;
    screen.titles = ["벌이다!!!"];
    const cycle = new OverlayCycle(
      new MemoryCache(withAugments),
      new FixedLeague({ phase: "InProgress", championId: 157, championName: null }),
      screen,
      new FixedLive({ gameTime: 12, level: 3, isDead: false }),
      {
        itemsFor: async () => [],
        augmentsFor: async () => [
          {
            id: null,
            name: "벌이다!!!",
            grade: "C",
            rarity: "gold",
            pickRate: 12,
            winRate: 44,
            iconUrl: null,
          },
        ],
      },
    );

    const { view } = await cycle.tick();
    expect(view.cards.map((card) => `${card.augment?.id}:${card.augment?.grade}`)).toEqual(["bees:C"]);
  });

  it("explains why grades are missing when offer cards are on screen", async () => {
    const screen = new RecordingScreen();
    screen.titles = [];
    screen.cardCount = 3;
    const cycle = new OverlayCycle(
      new MemoryCache(withAugments),
      new FixedLeague({ phase: "InProgress", championId: 157, championName: null }),
      screen,
      new FixedLive({ gameTime: 12, level: 3, isDead: false }),
      { itemsFor: async () => [{ name: "삼위일체", iconUrl: "trinity.png" }] },
    );

    const { view } = await cycle.tick();
    expect(view.cards).toEqual([]);
    expect(view.build).toEqual([]);
    expect(view.notice).toMatch(/글자를 못 읽었습니다/);
  });

  it("writes the miss to the hunt log once", async () => {
    const lines: string[] = [];
    const screen = new RecordingScreen();
    screen.titles = [];
    screen.cardCount = 3;
    const cycle = new OverlayCycle(
      new MemoryCache(withAugments),
      new FixedLeague({ phase: "InProgress", championId: 157, championName: null }),
      screen,
      new FixedLive({ gameTime: 12, level: 3, isDead: false }),
      { itemsFor: async () => [] },
      (message) => lines.push(message),
    );

    await cycle.tick();
    cycle["lastOcrAt"] = 0;
    await cycle.tick();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/카드 3장/);
    expect(lines[0]).toMatch(/글자를 못 읽었습니다/);
  });

  it("does not read the loading screen before the match has started", async () => {
    const screen = new RecordingScreen();
    const cycle = new OverlayCycle(
      new MemoryCache(withAugments),
      new FixedLeague({ phase: "InProgress", championId: 157, championName: null }),
      screen,
      { read: async () => null },
    );

    const { view } = await cycle.tick();
    expect(view.visible).toBe(false);
    expect(screen.calls).toBe(0);
  });
});
