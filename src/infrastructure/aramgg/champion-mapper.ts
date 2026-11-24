import type { ChampionStat } from "../../domain/champion";
import { gradeFromAramggTier } from "../../domain/grade";
import { toPercent } from "./percent";

interface AramggEnvelope<T> {
  data?: T;
}

interface AramggChampion {
  id?: string | number;
  key?: string;
  name?: string;
  alias?: string;
  title?: string;
  iconUrl?: string;
  statsAvailable?: boolean;
  stats?: {
    tier?: number | string;
    pickRate?: number;
    winRate?: number;
    statsAvailable?: boolean;
  };
}

export function mapAramggChampions(payload: AramggEnvelope<AramggChampion[]>): ChampionStat[] {
  const champions: ChampionStat[] = [];

  for (const row of payload.data ?? []) {
    if (row.statsAvailable === false || row.stats?.statsAvailable === false) continue;
    const grade = gradeFromAramggTier(row.stats?.tier ?? null);
    const id = Number(row.id);
    const key = String(row.alias || row.key || "");
    if (!grade || !Number.isFinite(id) || id <= 0 || !key) continue;

    champions.push({
      id,
      key,
      names: {
        ko: row.name || key,
        en: row.alias || key,
      },
      title: row.title || "",
      iconUrl: `https://cdn.communitydragon.org/latest/champion/${id}/square`,
      grade,
      pickRate: toPercent(row.stats?.pickRate),
      winRate: toPercent(row.stats?.winRate),
    });
  }

  return champions;
}
