import { readFileSync } from "fs";
import path from "path";
import type { AugmentDescriptions } from "../../application/ports";

export class BundledAugmentDescriptions implements AugmentDescriptions {
  private pending: Promise<Map<number, string>> | null = null;

  constructor(
    private readonly filePath = path.join(__dirname, "../../../assets/augments/descriptions.json"),
  ) {}

  fetch(): Promise<Map<number, string>> {
    if (!this.pending) this.pending = Promise.resolve(loadDescriptions(this.filePath));
    return this.pending;
  }
}

function loadDescriptions(file: string): Map<number, string> {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Record<string, string>;
    const map = new Map<number, string>();
    for (const [key, value] of Object.entries(parsed ?? {})) {
      const id = Number(key);
      if (!Number.isFinite(id) || id <= 0 || !value) continue;
      map.set(id, value);
    }
    return map;
  } catch {
    return new Map();
  }
}
