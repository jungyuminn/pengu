export function kdaRatio(kills: number, deaths: number, assists: number): number {
  const plus = nonNeg(kills) + nonNeg(assists);
  const down = nonNeg(deaths);
  if (down === 0) return plus === 0 ? 0 : Number.POSITIVE_INFINITY;
  return plus / down;
}

export function formatKda(kills: number, deaths: number, assists: number): string {
  const ratio = kdaRatio(kills, deaths, assists);
  if (!Number.isFinite(ratio)) return "Perfect";
  return ratio.toFixed(2);
}

export type KdaTone = "low" | "ok" | "high";

export function kdaTone(value: number | string | null | undefined): KdaTone {
  if (value === "Perfect") return "high";
  const ratio = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(ratio)) return "low";
  if (ratio >= 4) return "high";
  if (ratio >= 2) return "ok";
  return "low";
}

export function averageKda(rows: Array<{ kills: number; deaths: number; assists: number }>): string | null {
  if (!rows.length) return null;
  return formatKda(
    sum(rows, (row) => row.kills),
    sum(rows, (row) => row.deaths),
    sum(rows, (row) => row.assists),
  );
}

function sum(rows: Array<{ kills: number; deaths: number; assists: number }>, pick: (row: { kills: number; deaths: number; assists: number }) => number): number {
  return rows.reduce((total, row) => total + pick(row), 0);
}

function nonNeg(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}
