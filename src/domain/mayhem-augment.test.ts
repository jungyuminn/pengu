import { describe, expect, it } from "vitest";
import { shouldReadAugmentScreen, skipMissedStartPick } from "./mayhem-augment";

describe("shouldReadAugmentScreen", () => {
  it("looks for the opening pick and the next level pick, not the whole fight", () => {
    expect(shouldReadAugmentScreen({ gameTime: 12, level: 3, isDead: false, completed: 0 })).toBe(true);
    expect(shouldReadAugmentScreen({ gameTime: 200, level: 6, isDead: false, completed: 1 })).toBe(false);
    expect(shouldReadAugmentScreen({ gameTime: 200, level: 6, isDead: true, completed: 1 })).toBe(true);
    expect(shouldReadAugmentScreen({ gameTime: 240, level: 7, isDead: false, completed: 1 })).toBe(true);
    expect(shouldReadAugmentScreen({ gameTime: 400, level: 16, isDead: false, completed: 4 })).toBe(false);
  });

  it("reads a later pick on death even after sitting at that level", () => {
    expect(
      shouldReadAugmentScreen({
        gameTime: 500,
        level: 11,
        isDead: true,
        completed: 2,
        secondsAtLevel: 120,
      }),
    ).toBe(true);
    expect(
      shouldReadAugmentScreen({
        gameTime: 500,
        level: 11,
        isDead: false,
        completed: 2,
        secondsAtLevel: 120,
      }),
    ).toBe(false);
  });

  it("keeps reading while the current offer is on screen", () => {
    expect(
      shouldReadAugmentScreen({ gameTime: 200, level: 6, isDead: false, completed: 1, watching: true }),
    ).toBe(true);
  });

  it("skips a missed opening pick after the start window", () => {
    expect(skipMissedStartPick({ gameTime: 80, level: 4, isDead: false, completed: 0 })).toBe(0);
    expect(skipMissedStartPick({ gameTime: 100, level: 4, isDead: false, completed: 0 })).toBe(1);
    expect(skipMissedStartPick({ gameTime: 100, level: 4, isDead: false, completed: 0, watching: true })).toBe(0);
  });
});
