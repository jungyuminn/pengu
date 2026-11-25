import { describe, expect, it } from "vitest";
import { pickMvpIndex, type MvpStats } from "./match-mvp";

describe("pickMvpIndex", () => {
  it("picks the best player on the losing team when they clearly carried", () => {
    expect(
      pickMvpIndex([
        row({ teamId: 100, kills: 12, deaths: 3, assists: 8, damage: 28000 }),
        row({ teamId: 100, kills: 4, deaths: 7, assists: 9, damage: 14000 }),
        row({ teamId: 200, kills: 18, deaths: 4, assists: 6, damage: 41000 }),
        row({ teamId: 200, kills: 2, deaths: 11, assists: 5, damage: 9000 }),
      ]),
    ).toBe(2);
  });

  it("lets a high-KDA player beat a padded damage lead", () => {
    expect(
      pickMvpIndex([
        row({ teamId: 100, kills: 6, deaths: 8, assists: 4, damage: 32000 }),
        row({ teamId: 100, kills: 14, deaths: 1, assists: 16, damage: 27000 }),
        row({ teamId: 200, kills: 3, deaths: 9, assists: 2, damage: 8000 }),
      ]),
    ).toBe(1);
  });

  it("keeps the earlier row when combat scores match", () => {
    const same = { teamId: 100, kills: 8, deaths: 4, assists: 8, damage: 20000 };
    expect(pickMvpIndex([row(same), row(same)])).toBe(0);
  });

  it("skips boards that have no combat stats", () => {
    expect(pickMvpIndex([row({}), row({ teamId: 200 })])).toBeNull();
    expect(pickMvpIndex([row({ damage: 1000 })])).toBeNull();
  });
});

function row(partial: Partial<MvpStats>): MvpStats {
  return {
    teamId: 100,
    kills: 0,
    deaths: 0,
    assists: 0,
    damage: 0,
    ...partial,
  };
}
