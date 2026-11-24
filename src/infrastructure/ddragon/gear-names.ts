import type { GearNameIndex, GearNames } from "../../application/ports";
import { emptyGearNames } from "../../application/merge-item-names";
import { getJson } from "../http";

interface DDragonFile {
  data?: Record<string, { name?: string; key?: string }>;
}

export class DDragonGearNames implements GearNames {
  private pending: Promise<GearNameIndex> | null = null;

  fetch(): Promise<GearNameIndex> {
    if (!this.pending) this.pending = loadGearNames().catch(() => emptyGearNames());
    return this.pending;
  }
}

async function loadGearNames(): Promise<GearNameIndex> {
  const versions = await getJson<string[]>("https://ddragon.leagueoflegends.com/api/versions.json");
  const version = versions[0];
  if (!version) return emptyGearNames();

  const [koItems, zhItems, koSpells, zhSpells] = await Promise.all([
    getJson<DDragonFile>(`https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/item.json`),
    getJson<DDragonFile>(`https://ddragon.leagueoflegends.com/cdn/${version}/data/zh_CN/item.json`),
    getJson<DDragonFile>(`https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/summoner.json`),
    getJson<DDragonFile>(`https://ddragon.leagueoflegends.com/cdn/${version}/data/zh_CN/summoner.json`),
  ]);

  return {
    ...indexItems(koItems, zhItems),
    ...indexSpells(koSpells, zhSpells),
  };
}

function indexItems(ko: DDragonFile, zh: DDragonFile): Pick<GearNameIndex, "itemById" | "itemByName"> {
  const itemById = new Map<number, string>();
  const itemByName = new Map<string, string>();
  for (const [id, row] of Object.entries(ko.data ?? {})) {
    const numericId = Number(id);
    const korean = row.name?.trim();
    if (!Number.isFinite(numericId) || numericId <= 0 || !korean) continue;
    itemById.set(numericId, korean);
    itemByName.set(korean, korean);
    const chinese = zh.data?.[id]?.name?.trim();
    if (chinese) itemByName.set(chinese, korean);
  }
  return { itemById, itemByName };
}

function indexSpells(ko: DDragonFile, zh: DDragonFile): Pick<GearNameIndex, "spellById" | "spellByName"> {
  const spellById = new Map<number, string>();
  const spellByName = new Map<string, string>();
  const zhByKey = new Map(
    Object.values(zh.data ?? {}).map((row) => [String(row.key ?? ""), row.name?.trim() ?? ""]),
  );
  for (const row of Object.values(ko.data ?? {})) {
    const numericId = Number(row.key);
    const korean = row.name?.trim();
    if (!Number.isFinite(numericId) || numericId <= 0 || !korean) continue;
    spellById.set(numericId, korean);
    spellByName.set(korean, korean);
    const chinese = zhByKey.get(String(row.key ?? ""));
    if (chinese) spellByName.set(chinese, korean);
  }
  return { spellById, spellByName };
}
