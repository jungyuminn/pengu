import { titleSlotsInBand } from "../../domain/layout";
import { cropBitmap, type RgbaBitmap } from "./band-bitmap";

export interface SlotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function titleSlotRects(width: number, height: number, cardCount: number): SlotRect[] {
  return titleSlotsInBand(cardCount)
    .map((rect) => ({
      x: clamp(Math.round(rect.x * width), 0, Math.max(0, width - 8)),
      y: clamp(Math.round(rect.y * height), 0, Math.max(0, height - 8)),
      width: Math.max(8, Math.round(rect.width * width)),
      height: Math.max(8, Math.round(rect.height * height)),
    }))
    .map((rect) => ({
      ...rect,
      width: Math.min(rect.width, width - rect.x),
      height: Math.min(rect.height, height - rect.y),
    }))
    .filter((rect) => rect.width >= 8 && rect.height >= 8);
}

export function cropTitleSlot(bitmap: RgbaBitmap, slot: SlotRect): RgbaBitmap {
  return cropBitmap(bitmap, slot);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
