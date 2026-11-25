export interface MvpStats {
  teamId?: number;
  kills: number;
  deaths: number;
  assists: number;
  damage: number;
}

const DAMAGE_SHARE = 0.55;
const KDA_SHARE = 0.25;
const KP_SHARE = 0.2;

export function pickMvpIndex(players: MvpStats[]): number | null {
  if (players.length < 2) return null;
  if (!players.some(hasCombat)) return null;
  const maxDamage = Math.max(1, ...players.map((row) => row.damage || 0));
  const maxKda = Math.max(1e-9, ...players.map((row) => kdaScore(row)));
  let bestIndex = 0;
  let best = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < players.length; index += 1) {
    const row = players[index];
    if (!row) continue;
    const score =
      DAMAGE_SHARE * ((row.damage || 0) / maxDamage) +
      KDA_SHARE * (kdaScore(row) / maxKda) +
      KP_SHARE * killParticipation(row, players);
    if (betterScore(score, row, index, best, players[bestIndex], bestIndex)) {
      best = score;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function hasCombat(row: MvpStats): boolean {
  return row.damage > 0 || row.kills > 0 || row.assists > 0;
}

function kdaScore(row: MvpStats | undefined): number {
  if (!row) return 0;
  return (nonNeg(row.kills) + nonNeg(row.assists)) / Math.max(1, nonNeg(row.deaths));
}

function killParticipation(row: MvpStats, players: MvpStats[]): number {
  const teamKills = players
    .filter((item) => (row.teamId && item.teamId ? item.teamId === row.teamId : true))
    .reduce((total, item) => total + nonNeg(item.kills), 0);
  return (nonNeg(row.kills) + nonNeg(row.assists)) / Math.max(1, teamKills);
}

function betterScore(
  score: number,
  row: MvpStats,
  index: number,
  best: number,
  current: MvpStats | undefined,
  currentIndex: number,
): boolean {
  if (score > best + 1e-9) return true;
  if (score < best - 1e-9) return false;
  if ((row.damage || 0) !== (current?.damage || 0)) return (row.damage || 0) > (current?.damage || 0);
  if (row.kills !== (current?.kills || 0)) return row.kills > (current?.kills || 0);
  if (row.deaths !== (current?.deaths || 0)) return row.deaths < (current?.deaths || 0);
  return index < currentIndex;
}

function nonNeg(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}
