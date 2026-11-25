import { describe, expect, it } from "vitest";
import type { MayhemProfile } from "../domain/mayhem";
import { SyncMayhemHistory } from "./sync-mayhem-history";

describe("SyncMayhemHistory", () => {
  it("merges new mayhem games onto the stored account", async () => {
    const store = memoryStore({
      puuid: "p",
      gameName: "펭귄",
      tagLine: "KR1",
      matches: [game(1, 1)],
    });
    const sync = new SyncMayhemHistory(
      {
        fetchRecent: async () => ({
          puuid: "p",
          gameName: "펭귄",
          tagLine: "KR1",
          profileIconId: 29,
          matches: [game(2, 2)],
        }),
      },
      store,
    );

    const profile = await sync.execute(true);
    expect(profile?.matches.map((row) => row.gameId)).toEqual([2, 1]);
    expect(profile?.profileIconId).toBe(29);
  });

  it("switches files when another account is logged in", async () => {
    const store = memoryStore({
      puuid: "old",
      gameName: "이전",
      tagLine: "KR1",
      matches: [game(1, 1)],
    });
    const sync = new SyncMayhemHistory(
      {
        fetchRecent: async () => ({
          puuid: "new",
          gameName: "지금",
          tagLine: "KR1",
          matches: [game(9, 9)],
        }),
      },
      store,
    );

    const profile = await sync.execute(true);
    expect(profile?.puuid).toBe("new");
    expect(profile?.matches.map((row) => row.gameId)).toEqual([9]);
    expect((await store.read("old"))?.matches).toHaveLength(1);
  });
});

function game(gameId: number, playedAt: number) {
  return {
    gameId,
    playedAt,
    championId: 81,
    win: true,
    kills: 1,
    durationSec: 0,
    deaths: 0,
    assists: 1,
    augmentIds: [] as number[],
    players: [],
  };
}

function memoryStore(seed: MayhemProfile) {
  const files = new Map<string, MayhemProfile>([[seed.puuid, seed]]);
  let active = seed.puuid;
  return {
    readActive: async () => files.get(active) ?? null,
    read: async (puuid: string) => files.get(puuid) ?? null,
    write: async (profile: MayhemProfile) => {
      files.set(profile.puuid, profile);
      active = profile.puuid;
    },
  };
}
