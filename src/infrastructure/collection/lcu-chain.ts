import { readFile } from "fs/promises";
import path from "path";
import type { CollectionSource } from "../../application/collect-matches";
import { InvalidSample } from "../../domain/collection-match";
import { mayhemGameId, type LcuGame } from "../lcu/match-mapper";
import { LcuHttpError } from "../lcu/request";
import { accountRef, lcuSample } from "./lcu-sample";
import { connectCollectionLcu, type RequestBudget } from "./lcu-session";
import { parseScopeContents } from "./scope-file";

export interface ChainPeerStore {
  rememberPeers(entries: ReadonlyArray<readonly [ref: string, puuid: string]>): void;
  lookupPuuid(ref: string): string | undefined;
}

function extractPeerEntries(raw: unknown): Array<[ref: string, puuid: string]> {
  if (!raw || typeof raw !== "object") return [];
  const game = raw as LcuGame;
  const entries: Array<[ref: string, puuid: string]> = [];
  const seen = new Set<string>();
  for (const identity of game.participantIdentities ?? []) {
    const puuid = identity?.player?.puuid;
    if (typeof puuid === "string" && puuid.trim()) {
      const trimmed = puuid.trim();
      const ref = accountRef(trimmed);
      if (!seen.has(ref)) {
        seen.add(ref);
        entries.push([ref, trimmed]);
      }
    }
  }
  return entries;
}

export class LcuChainSource implements CollectionSource {
  private constructor(
    readonly owner: string,
    readonly location: string,
    private readonly accounts: Map<string, string>,
    private readonly read: (route: string) => Promise<unknown>,
    private readonly peers?: ChainPeerStore,
  ) {}

  static async connect(
    budget: RequestBudget,
    file?: string,
    signal?: AbortSignal,
    expectedFingerprint?: string,
    peers?: ChainPeerStore,
  ) {
    const scopeFile = file ? path.resolve(file) : undefined;
    let contents = scopeFile ? await readFile(scopeFile, "utf8") : undefined;
    const parsed = contents !== undefined ? parseScopeContents(contents) : undefined;
    const fingerprint = parsed?.fingerprint;
    const minIntervalMs = parsed?.document.minIntervalMs ?? 1000;
    const changed = "연쇄 조회 범위가 변경됐습니다. 기존 대기 작업을 abandon한 뒤 새 범위로 시작하세요.";
    if (expectedFingerprint !== undefined && expectedFingerprint !== fingerprint) throw new Error(changed);

    const session = await connectCollectionLcu({
      reserveRequest: () => budget.reserveRequest(minIntervalMs),
      blockUntil: time => budget.blockUntil(time),
    }, scopeFile ? async () => {
      const updated = await readFile(scopeFile, "utf8");
      if (updated === contents) return;
      if (parseScopeContents(updated).fingerprint !== fingerprint) throw new Error(changed);
      contents = updated;
    } : undefined, signal);

    const accounts = new Map<string, string>(parsed?.puuids);
    const owner = accountRef(session.puuid);
    accounts.set(owner, session.puuid);
    peers?.rememberPeers([[owner, session.puuid]]);

    const location = scopeFile && fingerprint
      ? JSON.stringify({ file: scopeFile, fingerprint })
      : JSON.stringify({ mode: "free-chain", seed: owner });

    return new LcuChainSource(owner, location, accounts, session.read, peers);
  }

  static resume(budget: RequestBudget, location: string, signal?: AbortSignal, peers?: ChainPeerStore) {
    const saved = JSON.parse(location);
    if (saved?.mode === "free-chain" && typeof saved.seed === "string") {
      return LcuChainSource.connect(budget, undefined, signal, undefined, peers);
    }
    if (!saved || typeof saved.file !== "string" || !path.isAbsolute(saved.file) ||
        typeof saved.fingerprint !== "string" || !/^[a-f0-9]{64}$/.test(saved.fingerprint)) {
      throw new Error("저장된 연쇄 조회 범위를 확인할 수 없습니다.");
    }
    return LcuChainSource.connect(budget, saved.file, signal, saved.fingerprint, peers);
  }

  private resolvePuuid(account: string): string | undefined {
    const cached = this.accounts.get(account);
    if (cached) return cached;
    const persisted = this.peers?.lookupPuuid(account);
    if (persisted) {
      this.accounts.set(account, persisted);
      return persisted;
    }
    return undefined;
  }

  async history(account: string, offset: number) {
    const puuid = this.resolvePuuid(account);
    if (!puuid) return null;
    if (!Number.isSafeInteger(offset) || offset < 0 || offset >= 100) throw new InvalidSample("history-offset");
    const end = Math.min(offset + 19, 99);
    const route = `/lol-match-history/v1/products/lol/${encodeURIComponent(puuid)}/matches?begIndex=${offset}&endIndex=${end}`;
    try {
      const raw = await this.read(route) as {
        games?: LcuGame[] | { games?: LcuGame[]; gameIndexBegin?: number; gameIndexEnd?: number };
      } | null;
      const data = raw?.games;
      const rows = Array.isArray(data) ? data : data?.games;
      if (!Array.isArray(rows)) throw new Error("LCU 전적 목록 형식을 확인할 수 없습니다.");
      const meta = Array.isArray(data) ? undefined : data;
      // Some clients return the entire 0..99 window for every requested offset.
      if (meta?.gameIndexBegin !== undefined && meta.gameIndexBegin !== offset) {
        if (meta.gameIndexBegin < offset) return { gameIds: [], nextPage: null };
        throw new InvalidSample("history-window");
      }
      const next = meta?.gameIndexEnd === undefined ? offset + rows.length : meta.gameIndexEnd + 1;
      const gameIds = rows.slice(0, 100 - offset).flatMap(row => mayhemGameId(row) ?? []);
      const fullWindow = meta?.gameIndexEnd === undefined ? rows.length === end - offset + 1 : meta.gameIndexEnd >= end;
      const hasMore = rows.length > 0 && fullWindow && Number.isSafeInteger(next) && next > offset && next < 100;
      return { gameIds, nextPage: hasMore ? next : null };
    } catch (error) {
      if (error instanceof LcuHttpError && error.status === 404) return null;
      throw error;
    }
  }

  async detail(gameId: number) {
    try {
      const raw = await this.read(`/lol-match-history/v1/games/${gameId}`);
      const peerEntries = extractPeerEntries(raw);
      for (const [ref, puuid] of peerEntries) this.accounts.set(ref, puuid);
      this.peers?.rememberPeers(peerEntries);
      const game = lcuSample(raw);
      return { sample: game.sample, accounts: game.accounts };
    } catch (error) {
      if (error instanceof LcuHttpError && error.status === 404) return null;
      throw error;
    }
  }
}
