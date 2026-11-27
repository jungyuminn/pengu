import { describe, expect, it } from "vitest";
import type { ChampionDetail } from "../domain/champion-detail";
import { overlayItemsFrom, withOwnedOverlayItems } from "./overlay-build";

describe("overlayItemsFrom", () => {
  it("keeps the first six core items", () => {
    const items = overlayItemsFrom({
      coreItems: [
        { name: "삼위일체", iconUrl: "a.png" },
        { name: "마나무네", iconUrl: null },
        { name: "정수 약탈자", iconUrl: "c.png" },
        { name: "나보리", iconUrl: null },
        { name: "도미닉", iconUrl: null },
        { name: "수호 천사", iconUrl: null },
        { name: "과잉", iconUrl: null },
      ],
    } as ChampionDetail);

    expect(items.map((item) => item.name)).toEqual([
      "삼위일체",
      "마나무네",
      "정수 약탈자",
      "나보리",
      "도미닉",
      "수호 천사",
    ]);
    expect(items[0]?.iconUrl).toBe("a.png");
  });

  it("marks items whose ids are in the live inventory", () => {
    const items = overlayItemsFrom({
      coreItems: [
        { id: 3078, name: "삼위일체", iconUrl: null },
        { id: 3004, name: "마나무네", iconUrl: null },
      ],
    } as ChampionDetail);

    expect(withOwnedOverlayItems(items, [3078]).map((item) => [item.name, item.owned])).toEqual([
      ["삼위일체", true],
      ["마나무네", false],
    ]);
  });

  it("returns nothing without a detail", () => {
    expect(overlayItemsFrom(null)).toEqual([]);
  });
});
