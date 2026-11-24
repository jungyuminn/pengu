import type { ScreenPage, ScreenReader } from "../../application/ports";
import { detectAugmentCardLayout } from "../../domain/augment-card-frame";
import { clampBox, paddleTitleRegions } from "../../domain/augment-layout";
import { offerCardsVisible } from "../../domain/offer-frame";
import { rerollButtonsVisible } from "../../domain/reroll";
import { titleActivityLikely } from "../../domain/title-activity";
import { cropBitmap, pixelAt } from "./band-bitmap";
import { FingerprintCache, bandFingerprint } from "./fingerprint";
import { pageFromTitles } from "./offer-scan";
import { PaddleOcrEngine } from "./paddle-engine";
import { captureClient } from "./win-capture";
import { leagueClientBox, leagueClientFocused } from "./win-league";

export class OcrScreenReader implements ScreenReader {
  private readonly engine: PaddleOcrEngine;
  private readonly cache = new FingerprintCache();
  private engineOk = true;
  private lastLayout: ReturnType<typeof detectAugmentCardLayout> = null;

  constructor(modelDir: string) {
    this.engine = new PaddleOcrEngine(modelDir);
  }

  async warm(): Promise<void> {
    await this.engine.warm().catch((error) => {
      this.engineOk = false;
      warn(`한글 인식 준비 실패: ${error instanceof Error ? error.message : "unknown"}`);
    });
  }

  stop(): void {
    this.engine.stop();
    this.cache.clear();
  }

  async read(): Promise<ScreenPage> {
    const box = leagueClientBox();
    if (!box) return unread("no-capture", false);
    if (!leagueClientFocused()) return unread("no-capture");
    try {
      const shot = captureClient(box);
      if (!shot) return unread("no-capture");
      const at = pixelAt(shot);
      const layout = detectAugmentCardLayout(shot.width, shot.height, at, this.lastLayout);
      this.lastLayout = layout;
      if (!layout) return { hasWindow: true, text: "", cardCount: 0, hint: "" };
      if (!titleActivityLikely(shot.width, shot.height, at, layout)) {
        return { hasWindow: true, text: "", cardCount: 0, hint: "" };
      }
      if (!rerollButtonsVisible(shot.width, shot.height, at, layout)) {
        return { hasWindow: true, text: "", cardCount: 0, hint: "" };
      }
      const titles = paddleTitleRegions(shot.width, shot.height, layout)
        .map((region) => {
          const box = clampBox(region, shot.width, shot.height);
          return cropBitmap(shot, { x: box.left, y: box.top, width: box.width, height: box.height });
        })
        .filter((slot) => slot.width >= 8 && slot.height >= 8);
      if (!offerCardsVisible(titles.length)) {
        return { hasWindow: true, text: "", cardCount: titles.length, hint: "" };
      }
      const hash = titles.map((slot) => bandFingerprint(slot)).join("|");
      const cached = this.cache.get(hash);
      if (cached) return cached;
      if (!this.engine.ready && this.engineOk) {
        await this.engine.warm().catch(() => {
          this.engineOk = false;
        });
      }
      const page = {
        hasWindow: true,
        ...(await pageFromTitles(titles, this.engine.ready ? this.engine : null)),
      };
      this.cache.set(hash, page);
      return page;
    } catch (error) {
      warn(`화면 읽기 실패: ${error instanceof Error ? error.message : "unknown"}`);
      return unread("no-capture");
    }
  }
}

function unread(hint: string, hasWindow = true): ScreenPage {
  return { hasWindow, text: "", cardCount: 0, hint };
}

function warn(message: string): void {
  try {
    process.stdout.write(`[pengu] ${message}\n`);
  } catch {
    return;
  }
}
