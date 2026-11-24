import type { NamedIcon } from "./champion-detail";

const FLASH_ID = 4;
const FLASH_NAMES = new Set(["점멸", "flash", "闪现"]);

export function isFlash(spell: Pick<NamedIcon, "id" | "name">): boolean {
  if (spell.id === FLASH_ID) return true;
  return FLASH_NAMES.has(spell.name.trim().toLowerCase());
}

export function orderSummonerSpells<T extends Pick<NamedIcon, "id" | "name">>(spells: T[]): T[] {
  if (spells.length < 2) return spells;
  const flashAt = spells.findIndex(isFlash);
  if (flashAt < 0 || flashAt === 1) return spells;
  const next = spells.slice();
  const [flash] = next.splice(flashAt, 1);
  next.splice(1, 0, flash);
  return next;
}
