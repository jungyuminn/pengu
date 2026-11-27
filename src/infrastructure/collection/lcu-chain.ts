import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import type { CollectionSource } from "../../application/collect-matches";
import { InvalidSample } from "../../domain/collection-match";
import { mayhemGameId, type LcuGame } from "../lcu/match-mapper";
import { LcuHttpError } from "../lcu/request";
import { accountRef, lcuSample } from "./lcu-sample";
import { connectCollectionLcu, type RequestBudget } from "./lcu-session";

function parseScope(raw: string) {
  let input: unknown;
  try {
    input = JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("권한 범위 파일에 UTF-8 JSON이 필요합니다.");
  }
  if (!input || typeof input !== "object" || !("puuids" in input) || !Array.isArray(input.puuids)) {
    throw new Error("권한 범위 파일에 puuids 배열이 필요합니다.");
  }
  const accounts = new Map<string, string>();
  for (const puuid of input.puuids) {
    if (typeof puuid !== "string" || !/^[A-Za-z0-9_-]+$/.test(puuid) || puuid === "current-summoner") {
      throw new Error("권한 범위 파일의 PUUID 형식을 확인하세요.");
    }
    accounts.set(accountRef(puuid), puuid);
  }
  const interval = "minIntervalMs" in input ? input.minIntervalMs : 1000;
  if (typeof interval !== "number" || !Number.isSafeInteger(interval) || interval < 1000 || interval > 2_147_483_647) {
    throw new Error("minIntervalMs는 1000 이상인 유효한 밀리초 간격이어야 합니다.");
  }
  const fingerprint = createHash("sha256").update([interval, ...[...accounts.keys()].sort()].join("\n")).digest("hex");
  return { accounts, fingerprint, interval };
}

export class LcuChainSource implements CollectionSource {
  private constructor(
    readonly owner: string,
    readonly location: string,
    private readonly accounts: ReadonlyMap<string, string>,
    private readonly read: (route: string) => Promise<unknown>,
  ) {}

  static async connect(budget: RequestBudget, file: string, signal?: AbortSignal, expectedFingerprint?: string) {
    const scopeFile = path.resolve(file);
    let contents = await readFile(scopeFile, "utf8");
    const { accounts, fingerprint, interval } = parseScope(contents);
    const changed = "연쇄 조회 범위가 변경됐습니다. 기존 대기 작업을 abandon한 뒤 새 범위로 시작하세요.";
    if (expectedFingerprint !== undefined && expectedFingerprint !== fingerprint) throw new Error(changed);
    const session = await connectCollectionLcu({
      reserveRequest: () => budget.reserveRequest(interval),
      blockUntil: time => budget.blockUntil(time),
    }, async () => {
      const updated = await readFile(scopeFile, "utf8");
      if (updated === contents) return;
      if (parseScope(updated).fingerprint !== fingerprint) throw new Error(changed);
      contents = updated;
    }, signal);
    const owner = accountRef(session.puuid);
    accounts.set(owner, session.puuid);
    return new LcuChainSource(owner, JSON.stringify({ file: scopeFile, fingerprint }), accounts, session.read);
  }

  static resume(budget: RequestBudget, location: string, signal?: AbortSignal) {
    const saved = JSON.parse(location);
    if (!saved || typeof saved.file !== "string" || !path.isAbsolute(saved.file) ||
        typeof saved.fingerprint !== "string" || !/^[a-f0-9]{64}$/.test(saved.fingerprint)) {
      throw new Error("저장된 연쇄 조회 범위를 확인할 수 없습니다.");
    }
    return LcuChainSource.connect(budget, saved.file, signal, saved.fingerprint);
  }

  async history(account: string, offset: number) {
    const puuid = this.accounts.get(account);
    if (!puuid) throw new Error("허용 범위 밖의 계정 작업입니다.");
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
      const game = lcuSample(await this.read(`/lol-match-history/v1/games/${gameId}`));
      const accounts = game.accounts.filter(ref => this.accounts.has(ref));
      if (!accounts.length) throw new InvalidSample("authorized-participant-unverified");
      return { sample: game.sample, accounts };
    } catch (error) {
      if (error instanceof LcuHttpError && error.status === 404) return null;
      throw error;
    }
  }
}
