export function toPercent(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return value <= 1 ? Math.round(value * 10000) / 100 : value;
}
