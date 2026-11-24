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
    return "증강 이름을 읽는 기능이 아직 준비되지 않았습니다. 인터넷을 켠 채로 앱을 다시 켜 주세요.";
  }
  const snippet = page.text.replace(/\s+/g, " ").trim().replace("[no-ocr]", "").trim().slice(0, 42);
  if (!snippet) return "카드는 보이는데 글자를 못 읽었습니다.";
  return `카드는 보이는데 증강 이름을 못 찾았습니다: ${snippet}`;
}
