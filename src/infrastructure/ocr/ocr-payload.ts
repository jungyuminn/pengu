import { titleLinesFromOcr } from "../../domain/ocr-titles";

export interface OcrPage {
  text: string;
  cardCount: number;
  hint: string;
}

export function pageFromOcrPayload(raw: string): OcrPage {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return { text: trimmed, cardCount: 0, hint: "" };
  try {
    const parsed = JSON.parse(trimmed) as {
      w?: number;
      h?: number;
      hint?: string;
      cards?: number;
      lines?: Array<{ t?: string; x?: number; y?: number; w?: number; h?: number }>;
    };
    const hint = String(parsed.hint ?? "");
    const cardCount = Number(parsed.cards) || 0;
    const rawLines = parsed.lines;
    const list = Array.isArray(rawLines) ? rawLines : rawLines ? [rawLines] : [];
    const lines = list.map((line) => ({
      text: String(line.t ?? ""),
      x: Number(line.x) || 0,
      y: Number(line.y) || 0,
      width: Number(line.w) || 0,
      height: Number(line.h) || 0,
    }));
    const titles = titleLinesFromOcr(lines, Number(parsed.w) || 1, Number(parsed.h) || 1);
    if (titles.length >= 2) return { text: titles.join("\n"), cardCount, hint };
    const leftover = lines
      .map((line) => line.text.trim())
      .filter((text) => text && !titles.includes(text));
    const text = [...titles, ...leftover].join("\n");
    if (text) return { text, cardCount, hint };
    if (hint === "no-ocr") return { text: "[no-ocr]", cardCount, hint };
    return { text: "", cardCount, hint };
  } catch {
    return { text: trimmed, cardCount: 0, hint: "" };
  }
}

export function textFromOcrPayload(raw: string): string {
  return pageFromOcrPayload(raw).text;
}
