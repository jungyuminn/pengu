import { describe, expect, it } from "vitest";
import { PrefetchChampionDetails } from "./prefetch-champion-details";

describe("PrefetchChampionDetails", () => {
  it("loads every queued champion id", async () => {
    const seen = new Set<number>();
    const loader = {
      async execute(id: number) {
        seen.add(id);
      },
    };
    const prefetch = new PrefetchChampionDetails(loader, 2);
    prefetch.enqueue([1, 2, 3]);
    await viWait();
    expect(seen).toEqual(new Set([1, 2, 3]));
  });
});

function viWait(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 30));
}
