import type { RgbaBitmap } from "./band-bitmap";

const SCALE = 2;
const CONTRAST = 1.7;
const LIFT = -46;

export function enhanceTitle(bitmap: RgbaBitmap): RgbaBitmap {
  const width = Math.max(8, bitmap.width * SCALE);
  const height = Math.max(8, bitmap.height * SCALE);
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sy = Math.min(bitmap.height - 1, Math.floor(y / SCALE));
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(bitmap.width - 1, Math.floor(x / SCALE));
      const src = (sy * bitmap.width + sx) * 4;
      const dest = (y * width + x) * 4;
      data[dest] = boost(bitmap.data[src] ?? 0);
      data[dest + 1] = boost(bitmap.data[src + 1] ?? 0);
      data[dest + 2] = boost(bitmap.data[src + 2] ?? 0);
      data[dest + 3] = 255;
    }
  }
  return { width, height, data };
}

function boost(value: number): number {
  return Math.max(0, Math.min(255, Math.round((value - 128) * CONTRAST + 128 + LIFT)));
}
