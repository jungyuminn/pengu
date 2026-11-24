import { getJson } from "../http";

export interface ChampionIndexEntry {
  id: number;
  key: string;
  name: string;
}

interface DDragonChampionFile {
  data?: Record<string, { key?: string; id?: string; name?: string }>;
}

export async function fetchChampionIndex(): Promise<ChampionIndexEntry[]> {
  const versions = await getJson<string[]>("https://ddragon.leagueoflegends.com/api/versions.json");
  const version = versions[0];
  if (!version) return [];

  const payload = await getJson<DDragonChampionFile>(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/champion.json`,
  );

  return Object.values(payload.data ?? {}).flatMap((row) => {
    const id = Number(row.key);
    const key = row.id?.trim() ?? "";
    if (!Number.isFinite(id) || id <= 0 || !key) return [];
    return [{ id, key, name: row.name || key }];
  });
}
