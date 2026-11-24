import { describe, expect, it } from "vitest";
import { championBuildLabel, matchHistoryLabel, statsSyncLabel } from "./sync-progress";

describe("sync progress labels", () => {
  it("names the catalog, build, and match steps", () => {
    expect(statsSyncLabel()).toBe("증강·챔피언 통계 받는 중...");
    expect(championBuildLabel(12, 173)).toBe("챔피언 빌드 받는 중 (12/173)...");
    expect(matchHistoryLabel()).toBe("전적 받는 중...");
  });
});
