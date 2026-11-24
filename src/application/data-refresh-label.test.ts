import { describe, expect, it } from "vitest";
import { dataRefreshLabel } from "./data-refresh-label";

describe("dataRefreshLabel", () => {
  it("shows the local date and time of the snapshot", () => {
    const syncedAt = new Date(2026, 9, 21, 14, 32).toISOString();
    expect(dataRefreshLabel(syncedAt)).toBe("데이터 갱신: 2026-10-21 14:32");
    expect(dataRefreshLabel(syncedAt, "16.23")).toBe("데이터 갱신: 2026-10-21 14:32 (16.23)");
  });

  it("falls back when the stamp is missing", () => {
    expect(dataRefreshLabel("")).toBe("데이터 갱신: -");
    expect(dataRefreshLabel("", "16.23")).toBe("데이터 갱신: - (16.23)");
  });
});
