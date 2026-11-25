import { withoutBoots } from "../domain/boots";
import type { ChampionDetail, NamedIcon } from "../domain/champion-detail";
import { orderSummonerSpells } from "../domain/summoner-spell";
import type { GearNameIndex } from "./ports";

export function emptyGearNames(): GearNameIndex {
  return {
    itemById: new Map(),
    itemByName: new Map(),
    itemTextById: new Map(),
    spellById: new Map(),
    spellByName: new Map(),
  };
}

export function mergeItemNames(detail: ChampionDetail, names: GearNameIndex | null): ChampionDetail {
  if (!names) {
    return {
      ...detail,
      coreItems: withoutBoots(detail.coreItems),
      summoners: orderSummonerSpells(detail.summoners),
    };
  }
  return {
    ...detail,
    coreItems: withoutBoots(detail.coreItems.map((item) => translate(item, names.itemById, names.itemByName, names.itemTextById))),
    startingItems: detail.startingItems.map((item) => translate(item, names.itemById, names.itemByName, names.itemTextById)),
    summoners: orderSummonerSpells(
      detail.summoners.map((item) => translate(item, names.spellById, names.spellByName)),
    ),
  };
}

function translate(
  item: NamedIcon,
  byId: Map<number, string>,
  byName: Map<string, string>,
  texts?: Map<number, string>,
): NamedIcon {
  const named = (item.id != null ? byId.get(item.id) : undefined) || byName.get(item.name);
  const description = (item.id != null ? texts?.get(item.id) : undefined) || item.description || null;
  return {
    ...item,
    name: named || item.name,
    description,
  };
}
