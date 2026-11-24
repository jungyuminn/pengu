import { describe, expect, it } from "vitest";
import { mapAramggAugments } from "./mapper";

describe("mapAramggAugments", () => {
  it("keeps Korean names and the patch from meta", () => {
    const snapshot = mapAramggAugments(
      {
        meta: { gamePatch: "16.23" },
        data: [
          {
            id: 1001,
            key: "ARAM_ImTheJuggernaut",
            name: "거인의 결의",
            rarity: "gold",
            stats: { tier: 2, pickRate: 0.21, winRate: 0.53, gamePatch: "16.23" },
          },
        ],
      },
      "2026-11-24T00:00:00.000Z",
    );

    expect(snapshot.patch).toBe("16.23");
    expect(snapshot.augments[0]?.names.ko).toBe("거인의 결의");
    expect(snapshot.augments[0]?.numericId).toBe(1001);
    expect(snapshot.augments[0]?.grade).toBe("A");
    expect(snapshot.augments[0]?.winRate).toBe(53);
  });
});
