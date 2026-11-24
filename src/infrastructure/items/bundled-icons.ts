import { readFileSync } from "fs";
import path from "path";
import type { ItemIcons } from "../../application/ports";

export interface ItemIconRow {
  id: number;
  file: string;
  names: string[];
}

export function bundledItemIconUrl(file: string): string {
  return `../../../assets/items/${file}`;
}

export function itemIconLookup(rows: ItemIconRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const url = bundledItemIconUrl(row.file);
    if (Number.isFinite(row.id) && row.id > 0) map.set(String(row.id), url);
    for (const name of row.names) {
      const key = name.trim();
      if (!key) continue;
      map.set(key, url);
      map.set(key.toLowerCase(), url);
    }
  }
  return map;
}

export class BundledItemIcons implements ItemIcons {
  private pending: Promise<Map<string, string>> | null = null;

  constructor(private readonly indexPath = path.join(__dirname, "../../../assets/items/index.json")) {}

  fetch(): Promise<Map<string, string>> {
    if (!this.pending) this.pending = Promise.resolve(loadIndex(this.indexPath));
    return this.pending;
  }
}

function loadIndex(file: string): Map<string, string> {
  try {
    const rows = JSON.parse(readFileSync(file, "utf8")) as ItemIconRow[];
    return itemIconLookup(Array.isArray(rows) ? rows : []);
  } catch {
    return new Map();
  }
}
