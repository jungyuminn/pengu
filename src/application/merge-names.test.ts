import { describe, expect, it } from "vitest";
import type { StatsSnapshot } from "../domain/augment";
import { mergeChampionNames } from "./merge-names";

describe("mergeChampionNames", () => {
  it("keeps aramgg grades and copies Korean names", () => {
    const stats: StatsSnapshot = {
      patch: "26.23",
      source: "aramgg",
      syncedAt: "2026-11-24T00:00:00.000Z",
      attribution: "test",
      augments: [],
      champions: [
        {
          id: 223,
          key: "TahmKench",
          names: { ko: "塔姆", en: "TahmKench" },
          title: "",
          iconUrl: null,
          grade: "S",
          pickRate: 15,
          winRate: null,
        },
      ],
    };

    const merged = mergeChampionNames(stats, [{ id: 223, key: "TahmKench", name: "탐 켄치" }]);
    expect(merged.champions[0]?.names.ko).toBe("탐 켄치");
    expect(merged.champions[0]?.grade).toBe("S");
  });
});
