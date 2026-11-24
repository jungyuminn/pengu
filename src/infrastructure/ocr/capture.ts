import type { PercentRect } from "../../domain/layout";
import { DEFAULT_CARD_TITLES, scaleRect } from "../../domain/layout";

export interface CapturePort {
  grabScreen(): Promise<{ buffer: Buffer; width: number; height: number }>;
  crop(buffer: Buffer, rect: { x: number; y: number; width: number; height: number }): Buffer;
}

export function cardRects(width: number, height: number): Array<{ x: number; y: number; width: number; height: number }> {
  return DEFAULT_CARD_TITLES.map((rect: PercentRect) => scaleRect(rect, width, height));
}
