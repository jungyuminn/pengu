import { offerCardsVisible } from "./offer-frame";

export interface OfferPage {
  hasWindow: boolean;
  text: string;
  cardCount: number;
  hint?: string;
}

export function offerMissNotice(page: OfferPage): string | null {
  if (!offerCardsVisible(page.cardCount)) return null;
  if (!page.hasWindow) return "롤 창을 못 찾았습니다. 게임이 보이는 상태로 두세요.";
  if (page.hint === "no-ocr" || page.text.includes("[no-ocr]")) {
    return "Windows 한국어 OCR이 없습니다. 설정 → 시간 및 언어 → 언어 → 한국어 → 언어 기능에서 광학 문자 인식을 켜 주세요.";
  }
  const snippet = page.text.replace(/\s+/g, " ").trim().replace("[no-ocr]", "").trim().slice(0, 42);
  if (!snippet) return "카드는 보이는데 글자를 못 읽었습니다. 롤을 테두리 없음으로 두세요.";
  return `카드는 보이는데 증강 이름을 못 찾았습니다: ${snippet}`;
}
