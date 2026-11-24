import path from "path";
import { Worker } from "worker_threads";
import type { RgbaBitmap } from "./band-bitmap";
import { ensureOcrModels } from "./ocr-models";

export interface OcrHit {
  text: string;
  score: number;
  box?: number[][];
}

export interface LineOcr {
  read(image: RgbaBitmap): Promise<OcrHit[]>;
}

type WorkerOk = { id: number; ok: true; texts?: OcrHit[] };
type WorkerErr = { id: number; ok: false; error: string };

export class PaddleOcrEngine implements LineOcr {
  private worker: Worker | null = null;
  private pending: Promise<void> | null = null;
  private failed = false;
  private booted = false;
  private nextId = 1;
  private waiting = new Map<number, { resolve: (value: WorkerOk) => void; reject: (error: Error) => void }>();
  private lastErr = "";

  constructor(private readonly modelDir: string) {}

  get ready(): boolean {
    return this.booted;
  }

  async warm(): Promise<void> {
    if (this.booted || this.failed) return;
    this.pending ??= this.load();
    try {
      await this.pending;
    } catch (error) {
      this.failed = true;
      this.pending = null;
      this.stop();
      throw error;
    }
  }

  async read(image: RgbaBitmap): Promise<OcrHit[]> {
    await this.warm();
    if (!this.worker || !this.booted) return [];
    try {
      const data = Uint8Array.from(image.data);
      const result = await this.ask(
        {
          type: "read",
          width: image.width,
          height: image.height,
          data,
        },
        900,
        [data.buffer],
      );
      return (result.texts ?? []).filter((line) => line.text);
    } catch (error) {
      this.warn(error instanceof Error ? error.message : "unknown");
      return [];
    }
  }

  stop(): void {
    for (const wait of this.waiting.values()) wait.reject(new Error("ocr worker stopped"));
    this.waiting.clear();
    this.worker?.terminate();
    this.worker = null;
    this.booted = false;
    this.pending = null;
  }

  private async load(): Promise<void> {
    const models = await ensureOcrModels(this.modelDir);
    const worker = new Worker(path.join(__dirname, "paddle-worker.js"));
    this.worker = worker;
    worker.on("message", (message: WorkerOk | WorkerErr) => {
      const wait = this.waiting.get(message.id);
      if (!wait) return;
      this.waiting.delete(message.id);
      if (message.ok) wait.resolve(message);
      else wait.reject(new Error(message.error || "ocr worker error"));
    });
    worker.on("error", (error) => {
      this.warn(error.message);
      this.failed = true;
      this.booted = false;
    });
    worker.on("exit", (code) => {
      if (code !== 0 && this.worker === worker) {
        this.failed = true;
        this.booted = false;
      }
    });
    await this.ask({ type: "init", models }, 60000, []);
    this.booted = true;
  }

  private ask(
    payload: Record<string, unknown>,
    timeoutMs: number,
    transfer: ArrayBuffer[] = [],
  ): Promise<WorkerOk> {
    const worker = this.worker;
    if (!worker) return Promise.reject(new Error("ocr worker is down"));
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiting.delete(id);
        reject(new Error("ocr timeout"));
      }, timeoutMs);
      this.waiting.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      worker.postMessage({ id, ...payload }, transfer);
    });
  }

  private warn(reason: string): void {
    if (reason === this.lastErr) return;
    this.lastErr = reason;
    try {
      process.stdout.write(`[pengu] 한글 인식 실패: ${reason}\n`);
    } catch {
      return;
    }
  }
}
