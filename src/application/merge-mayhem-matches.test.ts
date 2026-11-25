import { describe, expect, it } from "vitest";
import type { MayhemMatch } from "../domain/mayhem";
import { mergeMayhemMatches } from "./merge-mayhem-matches";

describe("mergeMayhemMatches", () => {
  it("keeps older mayhem games after newer rift games would hide them in LCU", () => {
    const stored = [match({ gameId: 1, playedAt: 1 })];
    const incoming = [match({ gameId: 2, playedAt: 2 })];
    expect(mergeMayhemMatches(stored, incoming).map((row) => row.gameId)).toEqual([2, 1]);
  });

  it("fills in augment ids without dropping a stored match", () => {
    const merged = mergeMayhemMatches(
      [match({ gameId: 1, augmentIds: [11] })],
      [match({ gameId: 1, win: false, augmentIds: [] })],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.augmentIds).toEqual([11]);
    expect(merged[0]?.win).toBe(false);
  });

  it("caps by most recent", () => {
    const rows = Array.from({ length: 5 }, (_, index) => match({ gameId: index + 1, playedAt: index + 1 }));
    expect(mergeMayhemMatches([], rows, 3).map((row) => row.gameId)).toEqual([5, 4, 3]);
  });
});

function match(partial: Partial<MayhemMatch> & Pick<MayhemMatch, "gameId">): MayhemMatch {
  return {
    playedAt: 1,
    championId: 81,
    win: true,
    kills: 1,
    durationSec: 0,
    deaths: 0,
    assists: 2,
    augmentIds: [],
    players: [],
    ...partial,
  };
}
