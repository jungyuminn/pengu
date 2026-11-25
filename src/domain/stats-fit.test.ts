import { describe, expect, it } from "vitest";
import { sequentialWeights, statsFit } from "./stats-fit";

describe("statsFit", () => {
  it("weights S higher than A, and C almost not at all", () => {
    const allS = statsFit({ augmentGrades: ["S", "S", "S"], itemIds: [], coreItemIds: [] });
    const mix = statsFit({ augmentGrades: ["S", "A", "C"], itemIds: [], coreItemIds: [] });
    expect(allS?.percent).toBe(100);
    expect(mix?.percent).toBe(60);
    expect(mix?.gradeCounts).toEqual({ S: 1, A: 1, B: 0, C: 1 });
  });

  it("treats earlier core items as more important", () => {
    const first = statsFit({ augmentGrades: [], itemIds: [10], coreItemIds: [10, 20, 30] });
    const last = statsFit({ augmentGrades: [], itemIds: [30], coreItemIds: [10, 20, 30] });
    expect(first?.percent).toBe(50);
    expect(last?.percent).toBe(17);
    expect(sequentialWeights(3)).toEqual([0.5, 1 / 3, 1 / 6]);
  });

  it("leans on augments more than items when both exist", () => {
    const fit = statsFit({
      augmentGrades: ["S", "S", "S"],
      itemIds: [],
      coreItemIds: [10, 20],
    });
    expect(fit?.percent).toBe(65);
  });
});
