import {
  namedScopeAccount,
  type ScopeAccount,
  type ScopeDocument,
  isScopePuuid,
} from "../domain/collection-scope";
import { parseRiotId, riotIdKey, riotIdLabel, type RiotId } from "../domain/riot-id";

export interface AliasLookup {
  lookup(id: RiotId): Promise<{ puuid: string; gameName: string; tagLine: string } | null>;
}

export type ScopeChangeStatus = "added" | "duplicate" | "missing" | "removed";

export interface ScopeChange {
  riotId: string;
  status: ScopeChangeStatus;
}

function byRiotId(accounts: ScopeAccount[], id: RiotId): ScopeAccount | undefined {
  const key = riotIdKey(id);
  return accounts.find(account => namedScopeAccount(account) && riotIdKey(account) === key);
}

function byPuuid(accounts: ScopeAccount[], puuid: string): ScopeAccount | undefined {
  return accounts.find(account => account.puuid === puuid);
}

export function listedScopeAccounts(document: ScopeDocument) {
  return document.accounts.map(account => (
    namedScopeAccount(account)
      ? { riotId: riotIdLabel(account) }
      : { riotId: null, puuid: account.puuid }
  ));
}

export async function addScopeAccounts(
  document: ScopeDocument,
  rawIds: string[],
  lookup: AliasLookup,
): Promise<{ document: ScopeDocument; results: ScopeChange[] }> {
  const accounts = document.accounts.map(account => ({ ...account }));
  const results: ScopeChange[] = [];
  for (const raw of rawIds) {
    const requested = parseRiotId(raw);
    const known = byRiotId(accounts, requested);
    if (known) {
      results.push({ riotId: riotIdLabel(known), status: "duplicate" });
      continue;
    }
    const found = await lookup.lookup(requested);
    if (!found || !isScopePuuid(found.puuid)) {
      results.push({ riotId: riotIdLabel(requested), status: "missing" });
      continue;
    }
    const existing = byPuuid(accounts, found.puuid);
    if (existing) {
      existing.gameName = found.gameName;
      existing.tagLine = found.tagLine;
      results.push({ riotId: riotIdLabel(found), status: "duplicate" });
      continue;
    }
    accounts.push({ gameName: found.gameName, tagLine: found.tagLine, puuid: found.puuid });
    results.push({ riotId: riotIdLabel(found), status: "added" });
  }
  return { document: { ...document, accounts }, results };
}

export function removeScopeAccounts(
  document: ScopeDocument,
  rawIds: string[],
): { document: ScopeDocument; results: ScopeChange[] } {
  const accounts = document.accounts.map(account => ({ ...account }));
  const results: ScopeChange[] = [];
  for (const raw of rawIds) {
    const value = raw.trim();
    let index = -1;
    try {
      const id = parseRiotId(value);
      index = accounts.findIndex(account => namedScopeAccount(account) && riotIdKey(account) === riotIdKey(id));
    } catch {
      index = accounts.findIndex(account => account.puuid === value);
    }
    if (index < 0) {
      results.push({ riotId: value, status: "missing" });
      continue;
    }
    const [removed] = accounts.splice(index, 1);
    results.push({
      riotId: namedScopeAccount(removed) ? riotIdLabel(removed) : removed.puuid,
      status: "removed",
    });
  }
  return { document: { ...document, accounts }, results };
}
