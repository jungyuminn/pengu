import type { RgbaBitmap } from "./band-bitmap";
import type { OcrHit } from "./paddle-engine";

export interface TitleRow {
  top: number;
  bottom: number;
}

export function stackTitleSlots(slots: RgbaBitmap[]): { image: RgbaBitmap; rows: TitleRow[] } {
  if (!slots.length) {
    return { image: { width: 8, height: 8, data: Buffer.alloc(8 * 8 * 4, 255) }, rows: [] };
  }
  const gap = Math.max(12, Math.round((slots[0]?.height ?? 16) * 0.18));
  const width = Math.max(...slots.map((slot) => slot.width));
  const height = slots.reduce((total, slot) => total + slot.height, 0) + gap * (slots.length - 1);
  const data = Buffer.alloc(width * height * 4, 255);
  const rows: TitleRow[] = [];
  let top = 0;
  for (const slot of slots) {
    const left = Math.max(0, Math.round((width - slot.width) / 2));
    blit(data, width, slot, left, top);
    rows.push({ top, bottom: top + slot.height });
    top += slot.height + gap;
  }
  return { image: { width, height, data }, rows };
}

export function hitsInRow(hits: OcrHit[], row: TitleRow): OcrHit[] {
  return hits.filter((hit) => {
    const y = hitCenterY(hit);
    return Number.isFinite(y) && y >= row.top && y < row.bottom;
  });
}

export function hitCenterY(hit: OcrHit): number {
  const box = hit.box;
  if (!Array.isArray(box) || !box.length) return Number.NaN;
  const ys = box.map((point) => Number(point?.[1])).filter((value) => Number.isFinite(value));
  if (!ys.length) return Number.NaN;
  return ys.reduce((sum, value) => sum + value, 0) / ys.length;
}

function blit(dest: Buffer, destWidth: number, slot: RgbaBitmap, left: number, top: number): void {
  for (let row = 0; row < slot.height; row += 1) {
    const src = row * slot.width * 4;
    const dst = ((top + row) * destWidth + left) * 4;
    slot.data.copy(dest, dst, src, src + slot.width * 4);
  }
}
