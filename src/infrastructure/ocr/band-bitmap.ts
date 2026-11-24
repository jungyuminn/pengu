import { PNG } from "pngjs";
import type { PixelAt } from "../../domain/offer-frame";

export interface RgbaBitmap {
  width: number;
  height: number;
  data: Buffer;
}

export function bitmapFromPng(png: Buffer): RgbaBitmap {
  const image = PNG.sync.read(png);
  const pixels = image.data;
  const count = Math.max(1, image.width * image.height);
  const channels = Math.max(1, Math.round(pixels.length / count));
  if (channels === 4) return { width: image.width, height: image.height, data: pixels };
  const data = Buffer.alloc(count * 4, 255);
  for (let i = 0, o = 0; i < pixels.length; i += channels, o += 4) {
    const r = pixels[i] ?? 0;
    data[o] = r;
    data[o + 1] = channels > 1 ? (pixels[i + 1] ?? r) : r;
    data[o + 2] = channels > 2 ? (pixels[i + 2] ?? r) : r;
  }
  return { width: image.width, height: image.height, data };
}

export function pixelAt(bitmap: RgbaBitmap): PixelAt {
  return (x, y) => {
    const i = (clamp(y, 0, bitmap.height - 1) * bitmap.width + clamp(x, 0, bitmap.width - 1)) * 4;
    return [bitmap.data[i] ?? 0, bitmap.data[i + 1] ?? 0, bitmap.data[i + 2] ?? 0];
  };
}

export function cropBitmap(
  bitmap: RgbaBitmap,
  rect: { x: number; y: number; width: number; height: number },
): RgbaBitmap {
  const x = clamp(Math.round(rect.x), 0, Math.max(0, bitmap.width - 1));
  const y = clamp(Math.round(rect.y), 0, Math.max(0, bitmap.height - 1));
  const width = clamp(Math.round(rect.width), 1, bitmap.width - x);
  const height = clamp(Math.round(rect.height), 1, bitmap.height - y);
  const data = Buffer.alloc(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const src = ((y + row) * bitmap.width + x) * 4;
    bitmap.data.copy(data, row * width * 4, src, src + width * 4);
  }
  return { width, height, data };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
