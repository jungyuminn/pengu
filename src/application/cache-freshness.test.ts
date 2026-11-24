import { describe, expect, it } from "vitest";
import { isSyncedToday } from "./cache-freshness";

describe("isSyncedToday", () => {
  it("treats the same local day as fresh", () => {
    const now = new Date("2026-11-24T15:00:00+09:00");
    expect(isSyncedToday("2026-11-24T01:00:00+09:00", now)).toBe(true);
    expect(isSyncedToday("2026-11-23T23:00:00+09:00", now)).toBe(false);
  });
});
