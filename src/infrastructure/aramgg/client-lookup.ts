import type { NamedIcon } from "../../domain/champion-detail";
import { getJson } from "../http";

const DATA_BASE = "https://data.dtodo.cn/api/client/v1/data";

interface LookupRow {
  id?: number;
  name?: string;
  iconUrl?: string;
}

interface LookupEnvelope {
  data?: LookupRow[];
}

export interface ClientLookup {
  items: Map<number, NamedIcon>;
  spells: Map<number, NamedIcon>;
}

export async function fetchClientLookup(version: string): Promise<ClientLookup> {
  const [items, spells] = await Promise.all([
    getJson<LookupEnvelope>(`${DATA_BASE}/${version}/items.json`).catch(() => ({ data: [] })),
    getJson<LookupEnvelope>(`${DATA_BASE}/${version}/summoner-spells.json`).catch(() => ({ data: [] })),
  ]);
  return {
    items: toMap(items.data),
    spells: toMap(spells.data),
  };
}

function toMap(rows: LookupRow[] | undefined): Map<number, NamedIcon> {
  const map = new Map<number, NamedIcon>();
  for (const row of rows ?? []) {
    const id = Number(row.id);
    if (!Number.isFinite(id) || id <= 0 || !row.name) continue;
    map.set(id, { id, name: row.name, iconUrl: row.iconUrl || null });
  }
  return map;
}
