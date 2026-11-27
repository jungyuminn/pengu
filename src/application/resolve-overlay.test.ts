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
  it("shows a grade when one augment card is read", () => {
    const view = resolveOverlay(snapshot, null, ["벌이다!!!"]);
    expect(view.visible).toBe(true);
    expect(view.cards).toHaveLength(1);
    expect(view.cards[0]?.augment?.id).toBe("bees");
    expect(view.cards[0]?.catalogRank).toBe(1);
    expect(view.cards[0]?.catalogTotal).toBe(2);
    expect(view.cards[0]?.advice).toBe("성능과 인기가 모두 좋아요");
  });

  it("shows grades when two or more cards are read", () => {
    const view = resolveOverlay(snapshot, { name: "야스오", grade: "A" }, ["벌이다!!!", "유레카", ""]);

    expect(view.visible).toBe(true);
    expect(view.champion?.grade).toBe("A");
    expect(view.cards[0]?.augment?.grade).toBe("S");
    expect(view.cards[1]?.augment?.grade).toBe("A");
    expect(view.cards[0]?.catalogRank).toBe(1);
    expect(view.cards[1]?.catalogRank).toBe(2);
    expect(view.cards[1]?.catalogTotal).toBe(2);
  });

  it("shows the champion grade even without augment cards", () => {
    const view = resolveOverlay(snapshot, { name: "야스오", grade: "A" }, ["", ""]);
    expect(view.visible).toBe(true);
    expect(view.champion?.name).toBe("야스오");
    expect(view.cards).toEqual([]);
  });

  it("uses the playing champion's aramgg grade instead of the global catalog", () => {
    const view = resolveOverlay(snapshot, { name: "야스오", grade: "A" }, ["벌이다!!!"], [
      {
        id: null,
        name: "유레카",
        grade: "S",
        rarity: "prismatic",
        pickRate: 20,
        winRate: 55,
        iconUrl: null,
      },
      {
        id: null,
        name: "벌이다!!!",
        grade: "C",
        rarity: "gold",
        pickRate: 12,
        winRate: 44,
        iconUrl: null,
      },
    ]);
    expect(view.cards[0]?.augment?.grade).toBe("C");
    expect(view.cards[0]?.catalogRank).toBe(2);
    expect(view.cards[0]?.catalogTotal).toBe(2);
    expect(view.cards[0]?.advice).toBe("이 챔피언에겐 잘 맞지 않아요");
  });

  it("uses the full catalog size as the rank total", () => {
    const view = resolveOverlay(
      {
        ...snapshot,
        augments: [
          ...snapshot.augments,
          {
            id: "engine",
            numericId: null,
            names: { ko: "탱크 엔진", en: "The Tank Engine" },
            rarity: "gold",
            grade: "B",
            pickRate: 10,
            winRate: 50,
            sample: null,
          },
        ],
      },
      { name: "야스오", grade: "A" },
      ["벌이다!!!"],
      [
        {
          id: null,
          name: "유레카",
          grade: "S",
          rarity: "prismatic",
          pickRate: 20,
          winRate: 55,
          iconUrl: null,
        },
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
    );
    expect(view.cards[0]?.catalogRank).toBe(2);
    expect(view.cards[0]?.catalogTotal).toBe(3);
  });

  it("hides the overlay when almost nothing was read", () => {
    const view = resolveOverlay(snapshot, null, ["", ""]);
    expect(view.visible).toBe(false);
  });
});
