import type { RiotId } from "../../domain/riot-id";
import { readLockfile } from "../lcu/lockfile";
import { summonerName, type LcuSummoner } from "../lcu/match-mapper";
import { LcuHttpError, lcuRequest } from "../lcu/request";

function summonerFromLookup(raw: unknown) {
  const row = Array.isArray(raw) ? raw[0] : raw;
  return summonerName((row ?? {}) as LcuSummoner);
}

export async function lookupAlias(id: RiotId) {
  const lock = await readLockfile();
  if (!lock) throw new Error("로그인한 리그 클라이언트가 필요합니다.");
  try {
    const raw = await lcuRequest<unknown>(lock, "/lol-summoner/v1/alias/lookup", {
      method: "POST",
      body: { gameName: id.gameName, tagLine: id.tagLine },
      timeoutMs: 15_000,
    });
    return summonerFromLookup(raw);
  } catch (error) {
    if (error instanceof LcuHttpError && error.status === 404) return null;
    throw error;
  }
}
