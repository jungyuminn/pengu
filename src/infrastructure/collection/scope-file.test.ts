import { describe, expect, it } from "vitest";
import { parseScopeContents, serializeScopeDocument } from "./scope-file";

describe("scope file", () => {
  it("keeps the chain fingerprint when names are added beside the same puuids", () => {
    const puuids = parseScopeContents(JSON.stringify({ puuids: ["abc", "def"], minIntervalMs: 1000 }));
    const named = parseScopeContents(JSON.stringify({
      accounts: [
        { gameName: "A", tagLine: "KR1", puuid: "abc" },
        { gameName: "B", tagLine: "KR1", puuid: "def" },
      ],
      puuids: ["abc", "def"],
      minIntervalMs: 1000,
    }));
    expect(named.fingerprint).toBe(puuids.fingerprint);
    expect([...named.puuids.values()].sort()).toEqual(["abc", "def"]);
  });

  it("round-trips named accounts into both accounts and puuids", () => {
    const raw = serializeScopeDocument({
      minIntervalMs: 1500,
      accounts: [{ gameName: "강아지", tagLine: "201", puuid: "p1" }],
    });
    const parsed = parseScopeContents(raw);
    expect(parsed.document).toEqual({
      minIntervalMs: 1500,
      accounts: [{ gameName: "강아지", tagLine: "201", puuid: "p1" }],
    });
    expect(JSON.parse(raw).puuids).toEqual(["p1"]);
  });

  it("rejects files with neither allow-list field", () => {
    expect(() => parseScopeContents("{}")).toThrow("puuids 또는 accounts");
    expect(() => parseScopeContents(JSON.stringify({ puuids: ["current-summoner"] }))).toThrow("PUUID");
  });
});
