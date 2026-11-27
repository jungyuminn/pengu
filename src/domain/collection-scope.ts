export interface ScopeAccount {
  gameName: string;
  tagLine: string;
  puuid: string;
}

export interface ScopeDocument {
  accounts: ScopeAccount[];
  minIntervalMs: number;
}

export const DEFAULT_SCOPE_INTERVAL_MS = 1000;
export const MAX_SCOPE_INTERVAL_MS = 2_147_483_647;

export function isScopePuuid(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value) && value !== "current-summoner";
}

export function namedScopeAccount(account: ScopeAccount): boolean {
  return Boolean(account.gameName && account.tagLine);
}
