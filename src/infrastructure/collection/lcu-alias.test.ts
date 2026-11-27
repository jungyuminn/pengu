import { afterEach, describe, expect, it, vi } from "vitest";
import { LcuHttpError } from "../lcu/request";
import * as lcu from "../lcu/request";
import * as lockfile from "../lcu/lockfile";
import { lookupAlias } from "./lcu-alias";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("lcu alias lookup", () => {
  it("posts the riot id and reads puuid from the summoner body", async () => {
    vi.spyOn(lockfile, "readLockfile").mockResolvedValue({ port: 1, password: "fixture" });
    const request = vi.spyOn(lcu, "lcuRequest").mockResolvedValue({
      puuid: "found", gameName: "강아지", tagLine: "201",
    });
    await expect(lookupAlias({ gameName: "강아지", tagLine: "201" })).resolves.toMatchObject({
      puuid: "found", gameName: "강아지", tagLine: "201",
    });
    expect(request).toHaveBeenCalledWith(
      { port: 1, password: "fixture" },
      "/lol-summoner/v1/alias/lookup",
      { method: "POST", body: { gameName: "강아지", tagLine: "201" }, timeoutMs: 15_000 },
    );
  });

  it("returns null when the alias does not exist", async () => {
    vi.spyOn(lockfile, "readLockfile").mockResolvedValue({ port: 1, password: "fixture" });
    vi.spyOn(lcu, "lcuRequest").mockRejectedValue(new LcuHttpError(404));
    await expect(lookupAlias({ gameName: "없는계정", tagLine: "KR1" })).resolves.toBeNull();
  });
});
