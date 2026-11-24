import { readFileSync } from "fs";
import path from "path";
import type { AugmentIcons } from "../../application/ports";

export interface AugmentIconRow {
  id: number;
  file: string;
}

export function bundledAugmentIconUrl(file: string): string {
  return `../../../assets/augments/${file}`;
}

export function bundledAugmentIconIndex(rows: AugmentIconRow[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const row of rows) {
    if (!Number.isFinite(row.id) || row.id <= 0 || !row.file) continue;
    map.set(row.id, bundledAugmentIconUrl(row.file));
  }
  return map;
}

export class BundledAugmentIcons implements AugmentIcons {
  private pending: Promise<Map<number, string>> | null = null;

  constructor(private readonly indexPath = path.join(__dirname, "../../../assets/augments/index.json")) {}

  fetch(): Promise<Map<number, string>> {
    if (!this.pending) this.pending = Promise.resolve(loadIndex(this.indexPath));
    return this.pending;
  }
}

function loadIndex(file: string): Map<number, string> {
  try {
    const rows = JSON.parse(readFileSync(file, "utf8")) as AugmentIconRow[];
    return bundledAugmentIconIndex(Array.isArray(rows) ? rows : []);
  } catch {
    return new Map();
  }
}
