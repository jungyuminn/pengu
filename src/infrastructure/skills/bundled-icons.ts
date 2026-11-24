import type { ChampionSkills } from "../../application/ports";

const KEYS = ["Q", "W", "E"] as const;

export function skillIconFileName(championKey: string, skill: string): string {
  const name = sanitize(championKey);
  const slot = skill.trim().toLowerCase();
  return `${name}_${slot}.png`;
}

export function bundledSkillIconUrl(championKey: string, skill: string): string {
  return `../../../assets/skills/${skillIconFileName(championKey, skill)}`;
}

export function skillIconIndex(championKey: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!sanitize(championKey)) return map;
  for (const key of KEYS) map.set(key, bundledSkillIconUrl(championKey, key));
  return map;
}

export class BundledSkillIcons implements ChampionSkills {
  fetch(championKey: string): Promise<Map<string, string>> {
    return Promise.resolve(skillIconIndex(championKey));
  }
}

function sanitize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
