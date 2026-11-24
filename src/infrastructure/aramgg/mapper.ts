import type { AugmentStat, StatsSnapshot } from "../../domain/augment";
import { gradeFromAramggTier } from "../../domain/grade";
import { toPercent } from "./percent";
import { toRarity } from "./rarity";

interface AramggEnvelope<T> {
  meta?: { gamePatch?: string };
  data?: T;
}

interface AramggAugment {
  id?: string | number;
  key?: string;
  name?: string;
  alias?: string;
  rarity?: string;
  rarityName?: string;
  statsAvailable?: boolean;
  stats?: {
    tier?: number | string;
    pickRate?: number;
    games?: number;
    gamePatch?: string;
    statsAvailable?: boolean;
  };
}

export function mapAramggAugments(
  payload: AramggEnvelope<AramggAugment[]>,
  syncedAt: string,
): StatsSnapshot {
  const rows = payload.data ?? [];
  const augments: AugmentStat[] = [];

  for (const row of rows) {
    const stats = row.stats;
    if (row.statsAvailable === false || stats?.statsAvailable === false) continue;
    const grade = gradeFromAramggTier(stats?.tier ?? null);
    if (!grade) continue;

    const numericId = Number(row.id);
    augments.push({
      id: String(row.key ?? row.id ?? row.name ?? ""),
      numericId: Number.isFinite(numericId) && numericId > 0 ? numericId : null,
      names: {
        ko: row.name || String(row.id ?? ""),
        en: row.alias || String(row.key ?? row.name ?? ""),
      },
      rarity: toRarity(row.rarity ?? row.rarityName),
      grade,
      pickRate: toPercent(stats?.pickRate),
      sample: stats?.games ?? null,
    });
  }

  const patch = payload.meta?.gamePatch ?? rows[0]?.stats?.gamePatch ?? "unknown";
  return {
    patch,
    source: "aramgg",
    syncedAt,
    attribution: "Data: aramgg.com",
    augments,
    champions: [],
  };
}

