import type { ScreenPage, ScreenReader } from "../../application/ports";
import { TITLE_BAND } from "../../domain/layout";
import { OcrWorker } from "./ocr-worker";

export class OcrScreenReader implements ScreenReader {
  private readonly worker: OcrWorker;

  constructor(workerScript: string) {
    this.worker = new OcrWorker(workerScript);
  }

  warm(): Promise<void> {
    return this.worker.warm();
  }

  stop(): void {
    this.worker.stop();
  }

  read(): Promise<ScreenPage> {
    return this.worker.scan(TITLE_BAND);
  }
}
