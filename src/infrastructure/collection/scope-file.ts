import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  DEFAULT_SCOPE_INTERVAL_MS,
  MAX_SCOPE_INTERVAL_MS,
  isScopePuuid,
  type ScopeAccount,
  type ScopeDocument,
} from "../../domain/collection-scope";
import { accountRef } from "./lcu-sample";

export interface ParsedScope {
  document: ScopeDocument;
  fingerprint: string;
  puuids: Map<string, string>;
}

function intervalOf(value: unknown): number {
  const interval = value === undefined ? DEFAULT_SCOPE_INTERVAL_MS : value;
  if (typeof interval !== "number" || !Number.isSafeInteger(interval)
      || interval < DEFAULT_SCOPE_INTERVAL_MS || interval > MAX_SCOPE_INTERVAL_MS) {
    throw new Error("minIntervalMs는 1000 이상인 유효한 밀리초 간격이어야 합니다.");
  }
  return interval;
}

function puuidOf(value: unknown): string {
  if (typeof value !== "string" || !isScopePuuid(value)) {
    throw new Error("권한 범위 파일의 PUUID 형식을 확인하세요.");
  }
  return value;
}

function accountOf(value: unknown): ScopeAccount {
  if (!value || typeof value !== "object" || !("puuid" in value)) {
    throw new Error("권한 범위 파일의 계정 형식을 확인하세요.");
  }
  const row = value as { gameName?: unknown; tagLine?: unknown; puuid: unknown };
  const gameName = row.gameName == null ? "" : row.gameName;
  const tagLine = row.tagLine == null ? "" : row.tagLine;
  if (typeof gameName !== "string" || typeof tagLine !== "string") {
    throw new Error("권한 범위 파일의 계정 형식을 확인하세요.");
  }
  return { gameName: gameName.trim(), tagLine: tagLine.trim(), puuid: puuidOf(row.puuid) };
}

export function parseScopeContents(raw: string): ParsedScope {
  let input: unknown;
  try {
    input = JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("권한 범위 파일에 UTF-8 JSON이 필요합니다.");
  }
  if (!input || typeof input !== "object") {
    throw new Error("권한 범위 파일에 puuids 또는 accounts 배열이 필요합니다.");
  }
  const row = input as { puuids?: unknown; accounts?: unknown; minIntervalMs?: unknown };
  if (row.puuids !== undefined && !Array.isArray(row.puuids)) {
    throw new Error("권한 범위 파일에 puuids 배열이 필요합니다.");
  }
  if (row.accounts !== undefined && !Array.isArray(row.accounts)) {
    throw new Error("권한 범위 파일에 accounts 배열이 필요합니다.");
  }
  if (row.puuids === undefined && row.accounts === undefined) {
    throw new Error("권한 범위 파일에 puuids 또는 accounts 배열이 필요합니다.");
  }
  const byPuuid = new Map<string, ScopeAccount>();
  for (const puuid of row.puuids ?? []) {
    const id = puuidOf(puuid);
    byPuuid.set(id, { gameName: "", tagLine: "", puuid: id });
  }
  for (const account of (row.accounts ?? []).map(accountOf)) {
    const previous = byPuuid.get(account.puuid);
    byPuuid.set(account.puuid, {
      puuid: account.puuid,
      gameName: account.gameName || previous?.gameName || "",
      tagLine: account.tagLine || previous?.tagLine || "",
    });
  }
  const document: ScopeDocument = {
    accounts: [...byPuuid.values()],
    minIntervalMs: intervalOf(row.minIntervalMs),
  };
  const puuids = new Map(document.accounts.map(account => [accountRef(account.puuid), account.puuid]));
  const fingerprint = createHash("sha256")
    .update([document.minIntervalMs, ...[...puuids.keys()].sort()].join("\n"))
    .digest("hex");
  return { document, fingerprint, puuids };
}

export function serializeScopeDocument(document: ScopeDocument): string {
  return `${JSON.stringify({
    accounts: document.accounts.map(account => (
      account.gameName || account.tagLine
        ? { gameName: account.gameName, tagLine: account.tagLine, puuid: account.puuid }
        : { puuid: account.puuid }
    )),
    puuids: document.accounts.map(account => account.puuid),
    minIntervalMs: document.minIntervalMs,
  }, null, 2)}\n`;
}

export async function readScopeFile(file: string): Promise<ParsedScope> {
  return parseScopeContents(await readFile(path.resolve(file), "utf8"));
}

export async function writeScopeFile(file: string, document: ScopeDocument): Promise<void> {
  const target = path.resolve(file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, serializeScopeDocument(document), "utf8");
}

export function emptyScopeDocument(): ScopeDocument {
  return { accounts: [], minIntervalMs: DEFAULT_SCOPE_INTERVAL_MS };
}
