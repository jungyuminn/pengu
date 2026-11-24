import { describe, expect, it } from "vitest";
import type { AugmentStat } from "./augment";
import { matchAugment } from "./match-name";

const bees: AugmentStat = {
    id: "bees",
    numericId: null,
  names: { ko: "벌이다!!!", en: "BEES!!!" },
  rarity: "gold",
  grade: "S",
  pickRate: 49,
  sample: null,
};

describe("matchAugment", () => {
  it("matches Korean names with punctuation noise", () => {
    expect(matchAugment("벌이다!!", [bees])?.id).toBe("bees");
  });

  it("matches English names ignoring case", () => {
    expect(matchAugment("bees", [bees])?.id).toBe("bees");
  });
});
