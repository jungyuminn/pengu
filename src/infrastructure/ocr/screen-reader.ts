import type { ScreenReader } from "../../application/ports";
import { cardRects, type CapturePort } from "./capture";
import { recognizePng } from "./windows-ocr";

export class OcrScreenReader implements ScreenReader {
  constructor(
    private readonly capture: CapturePort,
    private readonly scriptPath: string,
  ) {}

  async readCardTitles(): Promise<string[]> {
    const shot = await this.capture.grabScreen();
    const titles: string[] = [];
    for (const rect of cardRects(shot.width, shot.height)) {
      const png = this.capture.crop(shot.buffer, rect);
      titles.push(await recognizePng(png, this.scriptPath));
    }
    return titles;
  }
}
