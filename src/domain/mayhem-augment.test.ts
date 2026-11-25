import { describe, expect, it } from "vitest";
import { shouldReadAugmentScreen, skipMissedStartPick } from "./mayhem-augment";

describe("shouldReadAugmentScreen", () => {
  it("looks for the augment screen whenever a pick can appear", () => {
    expect(shouldReadAugmentScreen({ gameTime: 12, level: 3, isDead: false, completed: 0 })).toBe(true);
    expect(shouldReadAugmentScreen({ gameTime: 200, level: 6, isDead: false, completed: 1 })).toBe(true);
    expect(shouldReadAugmentScreen({ gameTime: 400, level: 15, isDead: false, completed: 4 })).toBe(true);
  });

  it("skips a missed opening pick after the start window", () => {
    expect(skipMissedStartPick({ gameTime: 80, level: 4, isDead: false, completed: 0 })).toBe(0);
    expect(skipMissedStartPick({ gameTime: 100, level: 4, isDead: false, completed: 0 })).toBe(1);
    expect(skipMissedStartPick({ gameTime: 100, level: 4, isDead: false, completed: 0, watching: true })).toBe(0);
  });
});
