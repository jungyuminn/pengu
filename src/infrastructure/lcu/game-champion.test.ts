import { describe, expect, it } from "vitest";
import { championIdFromGameflow } from "./game-champion";

const me = { puuid: "me-puuid", internalName: "me-internal", displayName: "펭구", gameName: "펭구" };

describe("championIdFromGameflow", () => {
  it("finds the local player on a live team", () => {
    expect(
      championIdFromGameflow(
        {
          gameData: {
            teamOne: [{ puuid: "other", championId: 1, summonerInternalName: "a" }],
            teamTwo: [{ puuid: "me-puuid", championId: 223, summonerInternalName: "me-internal" }],
          },
        },
        me,
      ),
    ).toBe(223);
  });

  it("falls back to champion selections by internal name", () => {
    expect(
      championIdFromGameflow(
        {
          gameData: {
            playerChampionSelections: [
              { championId: 99, summonerInternalName: "other" },
              { championId: 157, summonerInternalName: "me-internal" },
            ],
          },
        },
        me,
      ),
    ).toBe(157);
  });

  it("returns null when the local player is missing", () => {
    expect(
      championIdFromGameflow(
        {
          gameData: {
            teamOne: [{ puuid: "other", championId: 1 }],
          },
        },
        me,
      ),
    ).toBeNull();
  });
});
