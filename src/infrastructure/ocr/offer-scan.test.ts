import { describe, expect, it } from "vitest";
import type { RgbaBitmap } from "./band-bitmap";
import { pageFromTitles, pickTitle } from "./offer-scan";
import type { OcrHit } from "./paddle-engine";

describe("pickTitle", () => {
  it("keeps a confident augment name and drops HUD noise", () => {
    expect(
      pickTitle([
        { text: "피해량", score: 0.99 },
        { text: "유레카", score: 0.92 },
        { text: "??", score: 0.4 },
      ]),
    ).toBe("유레카");
  });

  it("leaves a slot empty when nothing is confident", () => {
    expect(pickTitle([{ text: "유레카", score: 0.2 }])).toBeNull();
    expect(pickTitle([{ text: "[]", score: 0.99 }])).toBeNull();
    expect(pickTitle([{ text: "유레카", score: 0.55 }])).toBe("유레카");
    expect(pickTitle([{ text: "유레카", score: 0.32 }])).toBe("유레카");
  });

  it("prefers a short title over a longer description in the same slot", () => {
    expect(
      pickTitle([
        { text: "유레카를 고르면 스킬가속이 크게 증가합니다", score: 0.96 },
        { text: "유레카", score: 0.61 },
      ]),
    ).toBe("유레카");
  });
});

describe("pageFromTitles", () => {
  it("reads stacked titles in one OCR pass", async () => {
    const ocr = new FakeOcr(["유레카", "탱크 엔진", "벌이다!!!"]);
    const page = await pageFromTitles([tiny(), tiny(), tiny()], ocr);
    expect(page.cardCount).toBe(3);
    expect(page.text.split("\n")).toEqual(["유레카", "탱크 엔진", "벌이다!!!"]);
    expect(ocr.calls).toBe(1);
  });

  it("reads one title per card and leaves a blank slot out", async () => {
    const ocr = new FakeOcr(["유레카", "", "벌이다!!!"]);
    const page = await pageFromTitles([tiny(), tiny(), tiny()], ocr);
    expect(page.cardCount).toBe(3);
    expect(page.text.split("\n")).toEqual(["유레카", "벌이다!!!"]);
    expect(ocr.calls).toBe(1);
  });

  it("marks a missing engine when cards are on screen", async () => {
    const page = await pageFromTitles([tiny(), tiny(), tiny()], null);
    expect(page.hint).toBe("no-ocr");
    expect(page.text).toBe("[no-ocr]");
  });

  it("ignores overlay junk like brackets", async () => {
    const ocr = new FakeOcr(["[]", "[]", "[]"]);
    const page = await pageFromTitles([tiny(), tiny(), tiny()], ocr);
    expect(page.text).toBe("");
    expect(page.cardCount).toBe(3);
  });

  it("keeps a low-confidence short title when other cards already matched", async () => {
    const ocr = new ScoredOcr([
      { text: "앙파상", score: 0.95 },
      { text: "유레카", score: 0.32 },
      { text: "대마법사", score: 0.94 },
    ]);
    const page = await pageFromTitles([tiny(), tiny(), tiny()], ocr);
    expect(page.text.split("\n")).toEqual(["앙파상", "유레카", "대마법사"]);
  });
});

class FakeOcr {
  calls = 0;
  constructor(private readonly titles: string[]) {}
  async read(image: RgbaBitmap): Promise<OcrHit[]> {
    this.calls += 1;
    const n = Math.max(1, this.titles.length);
    return this.titles.flatMap((text, index) => {
      if (!text) return [];
      const y = ((index + 0.4) * image.height) / n;
      return [{ text, score: 0.95, box: [[0, y], [8, y], [8, y + 2], [0, y + 2]] }];
    });
  }
}

class ScoredOcr {
  calls = 0;
  constructor(private readonly hits: Array<{ text: string; score: number }>) {}
  async read(image: RgbaBitmap): Promise<OcrHit[]> {
    this.calls += 1;
    const n = Math.max(1, this.hits.length);
    return this.hits.map((hit, index) => {
      const y = ((index + 0.4) * image.height) / n;
      return { text: hit.text, score: hit.score, box: [[0, y], [8, y], [8, y + 2], [0, y + 2]] };
    });
  }
}

function tiny(): RgbaBitmap {
  const width = 32;
  const height = 16;
  const data = Buffer.alloc(width * height * 4, 255);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 18;
    data[i + 1] = 24;
    data[i + 2] = 28;
  }
  return { width, height, data };
}
