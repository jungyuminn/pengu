import { CHAMPION_NICKNAMES } from "./champion-nicknames";
import { choseong, normalizeName } from "./text";

export function championSearchText(champion: {
  id: number;
  key: string;
  names: { ko: string; en: string };
}): string {
  const parts = [
    champion.names.ko,
    champion.names.en,
    champion.key,
    choseong(champion.names.ko),
    ...(CHAMPION_NICKNAMES[champion.id] ?? []),
  ];
  return parts.map(normalizeName).filter(Boolean).join("|");
}

export function matchesChampionSearch(searchText: string, query: string): boolean {
  const needle = normalizeName(query);
  if (!needle) return true;
  return searchText.includes(needle);
}
