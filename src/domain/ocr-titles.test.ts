import { describe, expect, it } from "vitest";
import { titleLinesFromOcr } from "./ocr-titles";

describe("titleLinesFromOcr", () => {
  it("picks the three horizontally spaced title lines", () => {
    const titles = titleLinesFromOcr(
      [
        { text: "챔피언", x: 20, y: 8, width: 40, height: 12 },
        { text: "피해량", x: 80, y: 8, width: 40, height: 12 },
        { text: "유레카", x: 30, y: 70, width: 80, height: 22 },
        { text: "벌이다!!!", x: 160, y: 72, width: 90, height: 22 },
        { text: "탱크 엔진", x: 300, y: 71, width: 80, height: 22 },
      ],
      400,
      120,
    );
    expect(titles).toEqual(["유레카", "벌이다!!!", "탱크 엔진"]);
  });

  it("keeps one title per card when rarity sits under the name", () => {
    const titles = titleLinesFromOcr(
      [
        { text: "트럼펫 폭발", x: 40, y: 80, width: 100, height: 24 },
        { text: "보조 피해량", x: 50, y: 108, width: 80, height: 12 },
        { text: "전술적 대비", x: 200, y: 82, width: 100, height: 24 },
        { text: "저항", x: 220, y: 110, width: 40, height: 12 },
        { text: "마법 미사일", x: 360, y: 81, width: 100, height: 24 },
        { text: "피해량", x: 380, y: 109, width: 50, height: 12 },
      ],
      500,
      200,
    );
    expect(titles).toEqual(["트럼펫 폭발", "전술적 대비", "마법 미사일"]);
  });

  it("keeps four horizontally spaced titles", () => {
    const titles = titleLinesFromOcr(
      [
        { text: "유레카", x: 20, y: 70, width: 70, height: 22 },
        { text: "벌이다!!!", x: 120, y: 72, width: 80, height: 22 },
        { text: "탱크 엔진", x: 220, y: 71, width: 80, height: 22 },
        { text: "검무", x: 320, y: 70, width: 70, height: 22 },
      ],
      420,
      120,
    );
    expect(titles).toEqual(["유레카", "벌이다!!!", "탱크 엔진", "검무"]);
  });
});
