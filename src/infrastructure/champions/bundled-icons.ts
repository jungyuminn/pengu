import type { ChampionPortraits } from "../../application/ports";

export function championIconFileName(championKey: string): string {
  const name = sanitize(championKey);
  return name ? `${name}.png` : "";
}

export function bundledChampionIconUrl(championKey: string): string | null {
  const file = championIconFileName(championKey);
  return file ? `../../../assets/champions/${file}` : null;
}

export class BundledChampionIcons implements ChampionPortraits {
  url(championKey: string): string | null {
    return bundledChampionIconUrl(championKey);
  }
}

function sanitize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
