import { championSearchText } from "../domain/champion-search";
import { GRADES, type Grade } from "../domain/grade";
import type { ChampionStat } from "../domain/champion";

export interface ChampionTierItem extends ChampionStat {
  searchText: string;
}

export interface ChampionTierGroup {
  grade: Grade;
  champions: ChampionTierItem[];
}

export function championIdsByGrade(champions: ChampionStat[]): number[] {
  return championTiers(champions).flatMap((group) => group.champions.map((item) => item.id));
}

export function championTiers(champions: ChampionStat[]): ChampionTierGroup[] {
  return GRADES.map((grade) => ({
    grade,
    champions: champions
      .filter((item) => item.grade === grade)
      .slice()
      .sort((left, right) => (right.pickRate ?? 0) - (left.pickRate ?? 0))
      .map((item) => ({ ...item, searchText: championSearchText(item) })),
  })).filter((group) => group.champions.length > 0);
}
