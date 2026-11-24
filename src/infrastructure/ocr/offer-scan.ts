import type { ScreenPage } from "../../application/ports";
import type { RgbaBitmap } from "./band-bitmap";
import type { LineOcr, OcrHit } from "./paddle-engine";
import { enhanceTitle } from "./title-enhance";
import { hitsInRow, stackTitleSlots } from "./title-stack";

const MIN_SCORE = 0.5;
const SHORT_MIN_SCORE = 0.28;
const FALLBACK_MIN_SCORE = 0.22;
const TITLE_LEN = 12;
const TITLE_NOISE = /^(피해량|저항|치유|회복|보조|골드|이동속도|보조피해량|주력피해량)$/;
const HAS_LETTER = /[\uac00-\ud7a3A-Za-z]/;

export async function pageFromTitles(
  slots: RgbaBitmap[],
  ocr: LineOcr | null,
): Promise<Omit<ScreenPage, "hasWindow">> {
  const cardCount = slots.length;
  if (!ocr) return { text: "[no-ocr]", cardCount, hint: "no-ocr" };

  const stacked = stackTitleSlots(slots.map(enhanceTitle));
  const hits = await readHits(ocr, stacked.image);
  const titles: string[] = [];
  for (const row of stacked.rows) {
    const rowHits = hitsInRow(hits, row);
    const title = pickTitle(rowHits) ?? fallbackTitle(rowHits);
    if (title) titles.push(title);
  }
  return { text: titles.join("\n"), cardCount, hint: "" };
}

export function pickTitle(hits: Array<{ text: string; score: number }>): string | null {
  return chooseTitle(
    hits.filter((hit) => hit.score >= minScoreFor(hit.text.trim()) && isTitleLike(hit.text.trim())),
  );
}

function fallbackTitle(hits: Array<{ text: string; score: number }>): string | null {
  const usable = hits.filter(
    (hit) =>
      hit.score >= FALLBACK_MIN_SCORE &&
      isTitleLike(hit.text.trim()) &&
      compactText(hit.text).length <= 8,
  );
  return chooseTitle(usable);
}

function chooseTitle(hits: Array<{ text: string; score: number }>): string | null {
  const usable = hits.map((hit) => ({ text: hit.text.trim(), score: hit.score })).filter((hit) => hit.text);
  if (!usable.length) return null;
  usable.sort((left, right) => {
    const leftTitle = compactText(left.text).length <= TITLE_LEN;
    const rightTitle = compactText(right.text).length <= TITLE_LEN;
    if (leftTitle !== rightTitle) return leftTitle ? -1 : 1;
    return right.score - left.score || compactText(left.text).length - compactText(right.text).length;
  });
  return usable[0]?.text ?? null;
}

function minScoreFor(text: string): number {
  return compactText(text).length <= 4 ? SHORT_MIN_SCORE : MIN_SCORE;
}

function compactText(text: string): string {
  return text.replace(/\s+/g, "");
}

async function readHits(ocr: LineOcr, image: RgbaBitmap): Promise<OcrHit[]> {
  try {
    return await ocr.read(image);
  } catch {
    return [];
  }
}

function isTitleLike(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  if (compact.length < 2 || compact.length > 24) return false;
  if (TITLE_NOISE.test(compact)) return false;
  return HAS_LETTER.test(compact);
}
