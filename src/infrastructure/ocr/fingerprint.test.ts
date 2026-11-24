import { describe, expect, it } from "vitest";
import type { RgbaBitmap } from "./band-bitmap";
import { FingerprintCache, bandFingerprint, shouldCachePage } from "./fingerprint";

describe("bandFingerprint", () => {
  it("stays the same for the same pixels", () => {
    const first = fill(64, 48, 40);
    const second = fill(64, 48, 40);
    expect(bandFingerprint(first)).toBe(bandFingerprint(second));
  });

  it("changes when the title cells change", () => {
    const left = fill(64, 48, 40);
    const right = fill(64, 48, 40);
    paint(right, 8, 24, 4, 12, 200);
    expect(bandFingerprint(left)).not.toBe(bandFingerprint(right));
  });
});

describe("FingerprintCache", () => {
  it("returns the page briefly then drops it", () => {
    const cache = new FingerprintCache();
    const page = { hasWindow: true, text: "유레카", cardCount: 3, hint: "" };
    cache.set("abc", page, 1_000);
    expect(cache.get("abc", 3_000)).toEqual(page);
    expect(cache.get("abc", 6_000)).toBeNull();
    expect(cache.get("zzz", 3_000)).toBeNull();
  });

  it("does not freeze a miss while offer cards are on screen", () => {
    expect(shouldCachePage({ hasWindow: true, text: "", cardCount: 3, hint: "" })).toBe(false);
    expect(shouldCachePage({ hasWindow: true, text: "유레카", cardCount: 3, hint: "" })).toBe(true);
    const cache = new FingerprintCache();
    cache.set("miss", { hasWindow: true, text: "", cardCount: 3, hint: "" }, 1_000);
    expect(cache.get("miss", 2_000)).toBeNull();
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

function paint(bitmap: RgbaBitmap, x0: number, x1: number, y0: number, y1: number, gray: number): void {
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const i = (y * bitmap.width + x) * 4;
      bitmap.data[i] = gray;
      bitmap.data[i + 1] = gray;
      bitmap.data[i + 2] = gray;
    }
  }
}
