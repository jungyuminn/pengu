const ASSET_BASE = "https://raw.communitydragon.org/latest/game/assets";

interface CherryAugment {
  id?: number;
  augmentLargeIconPath?: string;
}

export function cdragonAssetUrl(gameDataPath: string): string {
  const relative = gameDataPath
    .replace(/^\/lol-game-data\/assets\/(?:ASSETS\/)?/i, "")
    .replace(/^\/+/, "")
    .toLowerCase();
  return `${ASSET_BASE}/${relative}`;
}

export function augmentIconIndex(rows: CherryAugment[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const row of rows) {
    const id = Number(row.id);
    const path = row.augmentLargeIconPath;
    if (!Number.isFinite(id) || id <= 0 || !path) continue;
    map.set(id, cdragonAssetUrl(path));
  }
  return map;
}
