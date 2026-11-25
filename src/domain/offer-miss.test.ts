import { describe, expect, it } from "vitest";
import { offerMissNotice } from "./offer-miss";

describe("offerMissNotice", () => {
  it("stays quiet when the offer cards are not on screen", () => {
    expect(offerMissNotice({ hasWindow: true, text: "", cardCount: 0 })).toBeNull();
  });

  it("explains a missing Korean OCR pack", () => {
    expect(offerMissNotice({ hasWindow: true, text: "[no-ocr]", cardCount: 3, hint: "no-ocr" })).toMatch(
      /한국어 OCR/,
    );
  });

  it("explains empty reading and unmatched names", () => {
    expect(offerMissNotice({ hasWindow: true, text: "", cardCount: 3 })).toMatch(/글자를 못 읽었습니다/);
    expect(offerMissNotice({ hasWindow: true, text: "???", cardCount: 3 })).toMatch(/증강 이름을 못 찾았습니다/);
  });
});
