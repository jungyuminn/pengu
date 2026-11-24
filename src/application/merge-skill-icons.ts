import type { ChampionDetail, ChampionSkill } from "../domain/champion-detail";

export function emptySkillIcons(): Map<string, string> {
  return new Map();
}

export function mergeSkillIcons(detail: ChampionDetail, icons: Map<string, string>): ChampionDetail {
  if (icons.size === 0 && (detail.skills?.length ?? 0) > 0) return detail;
  const byKey = new Map((detail.skills ?? []).map((skill) => [skill.key.toUpperCase(), skill]));
  const skills: ChampionSkill[] = skillKeys(detail.skillOrder).map((key) => {
    const existing = byKey.get(key);
    return {
      key,
      name: existing?.name || key,
      iconUrl: icons.get(key) || existing?.iconUrl || null,
    };
  });
  return { ...detail, skills };
}

function skillKeys(order: string): string[] {
  const keys = String(order ?? "")
    .split(/\s*>\s*/)
    .map((key) => key.trim().toUpperCase())
    .filter(Boolean);
  return keys.length ? [...new Set(keys)] : ["Q", "W", "E"];
}
