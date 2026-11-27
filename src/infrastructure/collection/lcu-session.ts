import { setTimeout as wait } from "timers/promises";
import { readLockfile } from "../lcu/lockfile";
import { summonerName, type LcuSummoner } from "../lcu/match-mapper";
import { LcuHttpError, lcuRequest } from "../lcu/request";

export interface RequestBudget {
  reserveRequest(minIntervalMs?: number): number;
  blockUntil(time: number): void;
}

export async function connectCollectionLcu(budget: RequestBudget, checkScope?: () => Promise<void>, signal?: AbortSignal) {
  const lock = await readLockfile();
  if (!lock) throw new Error("로그인한 리그 클라이언트가 필요합니다.");
  const read = async (path: string): Promise<unknown> => {
    for (;;) {
      await checkScope?.();
      signal?.throwIfAborted();
      const delay = budget.reserveRequest();
      if (delay === 0) break;
      await wait(delay, undefined, { signal });
    }
    try {
      const result = await lcuRequest<unknown>(lock, path);
      await checkScope?.();
      return result;
    } catch (error) {
      if (error instanceof LcuHttpError && error.status === 429) {
        const now = Date.now();
        const header = error.retryAfter?.trim();
        const until = header && /^\d+$/.test(header) ? now + Number(header) * 1000 : Date.parse(header ?? "");
        budget.blockUntil(Number.isFinite(until) && until > now ? until : now + 60_000);
      }
      if (error instanceof SyntaxError) throw new Error("LCU 응답이 올바른 JSON 형식이 아닙니다.");
      throw error;
    }
  };
  const me = summonerName((await read("/lol-summoner/v1/current-summoner") ?? {}) as LcuSummoner);
  if (!me) throw new Error("현재 계정을 확인할 수 없습니다.");
  return { puuid: me.puuid, read };
}
