import type { ScreenPage } from "../../application/ports";
import { offerCardsVisible } from "../../domain/offer-frame";
import type { RgbaBitmap } from "./band-bitmap";

const COLS = 32;
const ROWS = 12;
const CACHE_MS = 4_000;

export function bandFingerprint(bitmap: RgbaBitmap): string {
  if (bitmap.width < 8 || bitmap.height < 8) return "";
  const values = Buffer.alloc(COLS * ROWS);
  let i = 0;
  for (let row = 0; row < ROWS; row += 1) {
    const y0 = Math.floor((row * bitmap.height) / ROWS);
    const y1 = Math.max(y0 + 1, Math.floor(((row + 1) * bitmap.height) / ROWS));
    for (let col = 0; col < COLS; col += 1) {
      const x0 = Math.floor((col * bitmap.width) / COLS);
      const x1 = Math.max(x0 + 1, Math.floor(((col + 1) * bitmap.width) / COLS));
      values[i] = cellLuma(bitmap, x0, x1, y0, y1);
      i += 1;
    }
  }
  return values.toString("base64");
}

export class FingerprintCache {
  private entry: { hash: string; at: number; page: ScreenPage } | null = null;

  get(hash: string, now = Date.now()): ScreenPage | null {
    if (!hash || !this.entry) return null;
    if (this.entry.hash !== hash) return null;
    if (now - this.entry.at >= CACHE_MS) return null;
    return this.entry.page;
  }

  set(hash: string, page: ScreenPage, now = Date.now()): void {
    if (!hash || !shouldCachePage(page)) return;
    this.entry = { hash, at: now, page };
  }

  clear(): void {
    this.entry = null;
  }
}

export function shouldCachePage(page: ScreenPage): boolean {
  if (offerCardsVisible(page.cardCount ?? 0) && !(page.text ?? "").replace(/\s+/g, "").trim()) return false;
  return true;
}

function cellLuma(bitmap: RgbaBitmap, x0: number, x1: number, y0: number, y1: number): number {
  let sum = 0;
  let n = 0;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * bitmap.width + x) * 4;
      sum += (bitmap.data[i] ?? 0) + (bitmap.data[i + 1] ?? 0) + (bitmap.data[i + 2] ?? 0);
      n += 1;
    }
  }
  return n ? Math.round(sum / n / 12) : 0;
}
