import { describe, expect, it } from "vitest";
import type { RgbaBitmap } from "./band-bitmap";
import { enhanceTitle } from "./title-enhance";

describe("enhanceTitle", () => {
  it("enlarges the crop and stretches contrast", () => {
    const src = fill(8, 8, 200);
    const next = enhanceTitle(src);
    expect(next.width).toBe(16);
    expect(next.height).toBe(16);
    expect(next.data[0]).toBeGreaterThan(200);
  });
});

function fill(width: number, height: number, gray: number): RgbaBitmap {
  const data = Buffer.alloc(width * height * 4, 255);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  return { width, height, data };
}
