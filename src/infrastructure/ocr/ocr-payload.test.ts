import { describe, expect, it } from "vitest";
import { pageFromOcrPayload, textFromOcrPayload } from "./ocr-payload";

describe("textFromOcrPayload", () => {
  it("returns only the title row when three augment names are visible", () => {
    const text = textFromOcrPayload(
      JSON.stringify({
        w: 400,
        h: 120,
        lines: [
          { t: "챔피언", x: 20, y: 8, w: 40, h: 12 },
          { t: "피해량", x: 80, y: 8, w: 40, h: 12 },
          { t: "유레카", x: 30, y: 70, w: 80, h: 22 },
          { t: "무리한 진입", x: 160, y: 72, w: 90, h: 22 },
          { t: "탱크 엔진", x: 300, y: 71, w: 80, h: 22 },
        ],
      }),
    );
    expect(text.split("\n")).toEqual(["유레카", "무리한 진입", "탱크 엔진"]);
  });

  it("marks missing Windows OCR so the overlay can say so", () => {
    expect(textFromOcrPayload(JSON.stringify({ hint: "no-ocr", w: 0, h: 0, lines: [] }))).toBe("[no-ocr]");
  });

  it("keeps the offer-card count from the worker", () => {
    expect(pageFromOcrPayload(JSON.stringify({ w: 10, h: 10, cards: 3, hint: "", lines: [] }))).toEqual({
      text: "",
      cardCount: 3,
      hint: "",
    });
  });
});
