import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SCOPE_INTERVAL_MS } from "../domain/collection-scope";
import { addScopeAccounts, listedScopeAccounts, removeScopeAccounts } from "./manage-scope";

const empty = { accounts: [] as const, minIntervalMs: DEFAULT_SCOPE_INTERVAL_MS };

describe("manage scope", () => {
  it("registers several riot ids, skips duplicates, and does not look up known names", async () => {
    const ids: Record<string, string> = { "Lzg#KR2": "lzg-id", "강아지#201": "dog-id", "새계정#KR1": "new-id" };
    const lookup = vi.fn(async ({ gameName, tagLine }: { gameName: string; tagLine: string }) => {
      const puuid = ids[`${gameName}#${tagLine}`];
      if (!puuid) return null;
      return { puuid, gameName, tagLine };
    });
    const first = await addScopeAccounts(empty, ["Lzg#KR2", "강아지#201"], { lookup });
    expect(first.results.map(row => row.status)).toEqual(["added", "added"]);
    const second = await addScopeAccounts(first.document, ["lzg#kr2", "강아지#201", "없는계정#KR1", "새계정#KR1"], { lookup });
    expect(second.results).toEqual([
      { riotId: "Lzg#KR2", status: "duplicate" },
      { riotId: "강아지#201", status: "duplicate" },
      { riotId: "없는계정#KR1", status: "missing" },
      { riotId: "새계정#KR1", status: "added" },
    ]);
    expect(lookup.mock.calls.map(([id]) => `${id.gameName}#${id.tagLine}`)).toEqual([
      "Lzg#KR2", "강아지#201", "없는계정#KR1", "새계정#KR1",
    ]);
    expect(listedScopeAccounts(second.document)).toEqual([
      { riotId: "Lzg#KR2" }, { riotId: "강아지#201" }, { riotId: "새계정#KR1" },
    ]);
  });

  it("treats a new name with an already stored puuid as a duplicate", async () => {
    const lookup = vi.fn(async () => ({ puuid: "same", gameName: "Now", tagLine: "KR1" }));
    const result = await addScopeAccounts(
      { accounts: [{ gameName: "", tagLine: "", puuid: "same" }], minIntervalMs: DEFAULT_SCOPE_INTERVAL_MS },
      ["Now#KR1"],
      { lookup },
    );
    expect(result.results).toEqual([{ riotId: "Now#KR1", status: "duplicate" }]);
    expect(result.document.accounts).toEqual([{ gameName: "Now", tagLine: "KR1", puuid: "same" }]);
  });

  it("removes by riot id or puuid and keeps unknown selectors", () => {
    const document = {
      minIntervalMs: DEFAULT_SCOPE_INTERVAL_MS,
      accounts: [
        { gameName: "Lzg", tagLine: "KR2", puuid: "one" },
        { gameName: "", tagLine: "", puuid: "legacy" },
      ],
    };
    const result = removeScopeAccounts(document, ["lzg#kr2", "legacy", "없는계정#KR1"]);
    expect(result.results.map(row => row.status)).toEqual(["removed", "removed", "missing"]);
    expect(result.document.accounts).toEqual([]);
  });
});
