import { mkdtemp, mkdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { collectMatches } from "../../application/collect-matches";
import { samplePatch } from "../../domain/collection-match";
import { LcuHttpError } from "../lcu/request";
import * as lcu from "../lcu/request";
import * as lockfile from "../lcu/lockfile";
import { ArchiveSource } from "./archive";
import { CurrentSource } from "./current-source";
import { LcuChainSource } from "./lcu-chain";
import { accountRef, lcuSample } from "./lcu-sample";
import { SqliteCollectionStore } from "./sqlite-store";

const sqlite = process.getBuiltinModule?.("node:sqlite") as typeof import("node:sqlite") | undefined;

function game(id: number, version = "16.22.1", accounts = ["a", "b"]) {
  return {
    gameId: id, gameVersion: version, platformId: "KR", queueId: 2400, gameMode: "KIWI",
    participantIdentities: accounts.map((puuid, i) => ({ participantId: i + 1, player: { puuid } })),
    participants: Array.from({ length: 10 }, (_, i) => ({
      participantId: i + 1, teamId: i < 5 ? 100 : 200, championId: 1 + i,
      stats: { win: i < 5, playerAugment1: 12, playerAugment2: 0, playerAugment3: 13 },
    })),
  };
}

const dirs: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});

async function chainFixture(allowed: string[], read: (route: string) => Promise<unknown>) {
  const dir = await mkdtemp(path.join(tmpdir(), "pengu-chain-test-"));
  dirs.push(dir);
  const file = path.join(dir, "scope.json");
  await writeFile(file, JSON.stringify({ puuids: allowed }));
  vi.spyOn(lockfile, "readLockfile").mockResolvedValue({ port: 1, password: "fixture" });
  const request = vi.spyOn(lcu, "lcuRequest").mockImplementation(async (_, route) => {
    if (route === "/lol-summoner/v1/current-summoner") return { puuid: "seed" };
    return read(route);
  });
  const budget = { reserveRequest: () => 0, blockUntil: vi.fn() };
  const source = await LcuChainSource.connect(budget, file);
  return { dir, file, source, request, budget };
}

describe("LCU chain", () => {
  it("accepts accounts-format scope files for the same allow-list", async () => {
    const { dir, budget } = await chainFixture([], async () => null);
    const file = path.join(dir, "named.json");
    await writeFile(file, JSON.stringify({
      accounts: [{ gameName: "N", tagLine: "KR1", puuid: "neighbour" }],
    }));
    const source = await LcuChainSource.connect(budget, file);
    expect(source.owner).toBe(accountRef("seed"));
    await expect(source.history(accountRef("neighbour"), 0)).rejects.toThrow("전적 목록");
  });

  it.skipIf(!sqlite)("resumes a live-source frontier and follows discovered match participants", async () => {
    const histories: Record<string, number[]> = { seed: [1], neighbour: [1, 2], last: [2, 3] };
    const participants = [["seed", "neighbour", "outside"], ["neighbour", "last"], ["last", "outside"]];
    const { dir, source, budget, request } = await chainFixture(["neighbour", "last", "unconnected"], async route => {
      const account = route.match(/^\/lol-match-history\/v1\/products\/lol\/(\w+)\/matches\?begIndex=0&endIndex=19$/)?.[1];
      if (account && Object.hasOwn(histories, account)) return { games: histories[account].map(id => game(id)) };
      const id = Number(route.match(/^\/lol-match-history\/v1\/games\/(\d+)$/)?.[1]);
      if (id >= 1 && id <= 3) return game(id, "16.23.1", participants[id - 1]);
      throw new Error("unexpected request");
    });
    const file = path.join(dir, "collection.sqlite");
    const initial = new SqliteCollectionStore(file);
    const run = initial.start("chain", source.location, source.owner);
    try {
      let steps = 0;
      await collectMatches(source, initial, run, () => steps++ >= 2);
      expect(initial.progress()).toMatchObject({ run: { added: 1 }, pending: 2 });
    } finally { initial.close(); }
    const reopened = new SqliteCollectionStore(file);
    try {
      const next = await LcuChainSource.resume(budget, reopened.current()!.location);
      await collectMatches(next, reopened, run);
      expect(reopened.progress()).toMatchObject({ pending: 0, run: { source: "chain", added: 3, repeated_refs: 2, state: "completed" } });
      expect(reopened.stats("16.23").games).toBe(3);
      expect(reopened.current()?.location).toBe("");
      expect(request.mock.calls.filter(([, route]) => route.includes("/matches?"))).toHaveLength(3);
    } finally { reopened.close(); }
  });

  it("rechecks scope before queued requests and before reopening a checkpoint", async () => {
    const { source, file, budget, request } = await chainFixture(["neighbour"], async () => game(1));
    const calls = request.mock.calls.length;
    await writeFile(file, JSON.stringify({ puuids: [] }));
    await expect(source.history(accountRef("neighbour"), 0)).rejects.toThrow("범위가 변경");
    await expect(source.detail(1)).rejects.toThrow("범위가 변경");
    await expect(LcuChainSource.resume(budget, source.location)).rejects.toThrow("범위가 변경");
    expect(request.mock.calls).toHaveLength(calls);
  });

  it("handles LCU windows that exceed or repeat the requested page and checks detail membership", async () => {
    const { source } = await chainFixture([], async route => {
      if (route.includes("/matches?")) return { games: {
        gameIndexBegin: 0, gameIndexEnd: 99, games: Array.from({ length: 96 }, (_, i) => game(i + 1)),
      } };
      return game(1, "16.23", ["outside"]);
    });
    expect((await source.history(source.owner, 0))?.gameIds).toHaveLength(96);
    expect((await source.history(source.owner, 0))?.nextPage).toBeNull();
    expect(await source.history(source.owner, 20)).toEqual({ gameIds: [], nextPage: null });
    expect((await source.detail(1))?.accounts).toEqual([accountRef("outside")]);
  });

  it("stops on access errors and records rate limits without alternate requests", async () => {
    const { source, request, budget } = await chainFixture(["neighbour"], async () => null);
    for (const status of [401, 403, 429]) {
      request.mockRejectedValueOnce(new LcuHttpError(status, "120"));
      await expect(source.history(accountRef("neighbour"), 0)).rejects.toMatchObject({ status });
    }
    expect(budget.blockUntil).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(4);
    request.mockRejectedValueOnce(new LcuHttpError(404));
    expect(await source.history(source.owner, 0)).toBeNull();
  });

  it("uses the configured interval and can pause a waiting request without sending it", async () => {
    const { file, request } = await chainFixture([], async () => null);
    await writeFile(file, JSON.stringify({ puuids: [], minIntervalMs: 5000 }));
    const stop = new AbortController();
    const budget = { reserveRequest: vi.fn(() => 0), blockUntil: vi.fn() };
    const source = await LcuChainSource.connect(budget, file, stop.signal);
    expect(budget.reserveRequest).toHaveBeenCalledWith(5000);
    const calls = request.mock.calls.length;
    budget.reserveRequest.mockImplementation(() => {
      setImmediate(() => stop.abort());
      return 5000;
    });
    await expect(source.history(source.owner, 0)).rejects.toMatchObject({ name: "AbortError" });
    expect(request.mock.calls).toHaveLength(calls);
  });
});

describe("local match collection", () => {
  it.skipIf(!sqlite)("reopens a checkpoint and follows a → b → c across cyclic, paged histories", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "pengu-collector-"));
    dirs.push(dir);
    async function json(parts: string[], data: unknown) {
      const file = path.join(dir, ...parts);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(data));
    }
    async function history(account: string, page: number, gameIds: number[], hasMore = false) {
      await json(["histories", accountRef(account), page + ".json"], { gameIds, hasMore });
    }
    await history("a", 0, [1], true);
    await history("a", 1, [1, 99]);
    await history("b", 0, [1, 2, 3]);
    await history("c", 0, [2, 4]);
    await json(["matches", "1.json"], game(1));
    await json(["matches", "2.json"], game(2, "16.23.123", ["b", "c"]));
    await json(["matches", "3.json"], game(3, "unknown"));
    await json(["matches", "4.json"], game(4, "16.22.2", ["c", "d"]));
    const source = new ArchiveSource(dir);
    const file = path.join(dir, "data.sqlite");
    const initial = new SqliteCollectionStore(file);
    const run = initial.start("archive", dir, accountRef("a"));
    let steps = 0;
    try {
      await collectMatches(source, initial, run, () => steps++ >= 2);
      expect(initial.progress().pending).toBeGreaterThan(0);
    } finally { initial.close(); }

    const store = new SqliteCollectionStore(file);
    try {
      await collectMatches(source, store, run);
      expect(store.progress()).toMatchObject({
        run: { added: 3, missing: 2, invalid: 1, repeated_refs: 3, active: 0 }, pending: 0,
        rejections: [{ reason: "game-version", total: 1 }],
      });
      expect(store.stats("16.22").games).toBe(2);
      expect(store.stats("16.22").augments).toContainEqual({ champion: 1, augment: 13, holders: 2 });
      expect(store.stats("16.23").games).toBe(1);
      const repeat = store.start("archive", dir, accountRef("b"));
      await collectMatches(source, store, repeat);
      expect(store.progress().run).toMatchObject({ added: 0, duplicates: 3 });
    } finally { store.close(); }
    const check = new sqlite!.DatabaseSync(file);
    try {
      expect(check.prepare("SELECT slot FROM augments WHERE game_id=2 AND participant=1 ORDER BY slot").all())
        .toEqual([{slot: 1}, {slot: 3}]);
      expect(check.prepare("SELECT * FROM jobs").all()).toEqual([]);
      expect(check.prepare("SELECT seed FROM run").get()?.seed).toBe("");
    } finally { check.close(); }
  });

  it("has no live neighbour lookup, verifies membership, and propagates access limits", async () => {
    const read = vi.fn(async (url: string): Promise<unknown> => {
      if (url.includes("current-summoner/matches")) return { games: { games: [game(1)] } };
      return game(1);
    });
    const me = accountRef("a");
    const source = new CurrentSource(me, read);
    expect(await source.history(accountRef("b"), 0)).toBeNull();
    expect(read).not.toHaveBeenCalled();
    expect(await source.history(me, 0)).toEqual({ gameIds: [1], nextPage: null });
    expect((await source.detail(1))?.accounts).toEqual([]);
    read.mockResolvedValueOnce(game(1, "16.22", ["other"]));
    await expect(source.detail(1)).rejects.toThrow("owner-unverified");
    for (const status of [401, 403, 429]) {
      read.mockRejectedValueOnce(new LcuHttpError(status, "5"));
      await expect(source.detail(1)).rejects.toMatchObject({status});
    }
  });

  it.skipIf(!sqlite)("keeps a failed task pending and honors cooldown after reopening SQLite", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "pengu-collector-"));
    dirs.push(dir);
    const file = path.join(dir, "data.sqlite");
    const store = new SqliteCollectionStore(file);
    try {
      const run = store.start("current", "", accountRef("a"));
      const source = new CurrentSource(accountRef("a"), async () => { throw new LcuHttpError(429); });
      await expect(collectMatches(source, store, run)).rejects.toMatchObject({ status: 429 });
      expect(store.progress()).toMatchObject({ pending: 1, run: { processed: 0 } });
      store.blockUntil(Date.now() + 10_000);
    } finally { store.close(); }
    const reopened = new SqliteCollectionStore(file);
    try {
      expect(() => reopened.reserveRequest()).toThrow("대기");
      reopened.abandon();
      expect(reopened.progress()).toMatchObject({ pending: 0, run: { state: "abandoned" } });
    } finally { reopened.close(); }
  });

  it("rejects incomplete, mismatched, and non-KR samples before publishing statistics", () => {
    const sample = lcuSample(game(1)).sample;
    for (const changed of [
      { gameId: 2 }, { platform: "JP1" }, { queueId: 450 }, { mode: "ARAM" }, { version: "" },
      { players: sample.players.slice(1) }, { players: Array(10).fill(sample.players[0]) },
    ]) expect(() => samplePatch({ ...sample, ...changed }, 1)).toThrow();
    const raw = game(1);
    expect(() => lcuSample({ ...raw, participants: [{ ...raw.participants[0], stats: {playerAugment1: 1} }] }))
      .toThrow("outcome");
  });

  it("records Retry-After even when the first session request is rate-limited", async () => {
    const now = Date.now();
    const budget = { reserveRequest: () => 0, blockUntil: vi.fn() };
    const lock = vi.spyOn(lockfile, "readLockfile").mockResolvedValue({ port: 1, password: "fixture" });
    const request = vi.spyOn(lcu, "lcuRequest").mockRejectedValue(new LcuHttpError(429, "120"));
    try {
      await expect(CurrentSource.connect(budget)).rejects.toMatchObject({ status: 429 });
      expect(request).toHaveBeenCalledTimes(1);
      expect(budget.blockUntil.mock.calls[0][0]).toBeGreaterThanOrEqual(now + 120_000);
    } finally {
      lock.mockRestore();
      request.mockRestore();
    }
  });
});
