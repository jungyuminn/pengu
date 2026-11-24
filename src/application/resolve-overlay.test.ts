import { describe, expect, it } from "vitest";
import type { StatsSnapshot } from "../domain/augment";
import { resolveOverlay } from "./resolve-overlay";

const snapshot: StatsSnapshot = {
  patch: "26.23",
  source: "aramgg",
  syncedAt: "2026-11-24T00:00:00.000Z",
  attribution: "Data: aramgg.com",
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

describe("resolveOverlay", () => {
  it("shows grades when two or more cards are read", () => {
    const view = resolveOverlay(snapshot, { name: "야스오", grade: "A" }, ["벌이다!!!", "유레카", ""]);

    expect(view.visible).toBe(true);
    expect(view.champion?.grade).toBe("A");
    expect(view.cards[0]?.augment?.grade).toBe("S");
    expect(view.cards[1]?.augment?.grade).toBe("A");
  });

  it("shows the champion grade even without augment cards", () => {
    const view = resolveOverlay(snapshot, { name: "야스오", grade: "A" }, ["", ""]);
    expect(view.visible).toBe(true);
    expect(view.champion?.name).toBe("야스오");
    expect(view.cards).toEqual([]);
  });

  it("hides the overlay when almost nothing was read", () => {
    const view = resolveOverlay(snapshot, null, ["", ""]);
    expect(view.visible).toBe(false);
  });
});
