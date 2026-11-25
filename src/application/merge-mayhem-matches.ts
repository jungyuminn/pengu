import { MAYHEM_MATCH_CAP, richerMayhemMatch, type MayhemMatch } from "../domain/mayhem";

export function mergeMayhemMatches(
  stored: MayhemMatch[],
  incoming: MayhemMatch[],
  cap = MAYHEM_MATCH_CAP,
): MayhemMatch[] {
  const byId = new Map<number, MayhemMatch>();
  for (const row of stored) {
    if (row.gameId > 0) byId.set(row.gameId, row);
  }
  for (const row of incoming) {
    if (row.gameId <= 0) continue;
    const previous = byId.get(row.gameId);
    byId.set(row.gameId, previous ? richerMayhemMatch(previous, row) : row);
  }
  return [...byId.values()].sort((left, right) => right.playedAt - left.playedAt).slice(0, cap);
}
