import { describe, expect, it } from "vitest";
import { champSelectChampionId } from "./champ-select";

describe("champSelectChampionId", () => {
  it("prefers the locked current champion", () => {
    expect(
      champSelectChampionId(222, {
        localPlayerCellId: 1,
        myTeam: [{ cellId: 1, championId: 157, championPickIntent: 81 }],
      }),
    ).toBe(222);
  });

  it("uses hover intent when nothing is locked", () => {
    expect(
      champSelectChampionId(0, {
        localPlayerCellId: 1,
        myTeam: [{ cellId: 1, championId: 0, championPickIntent: 222 }],
      }),
    ).toBe(222);
  });

  it("returns nothing when the player has not hovered a champion", () => {
    expect(champSelectChampionId(0, { localPlayerCellId: 1, myTeam: [{ cellId: 1 }] })).toBeNull();
  });
});
