import { spawn, type ChildProcess } from "child_process";
import { mkdtemp, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import readline from "readline";
import type { PercentRect } from "../../domain/layout";
import { pageFromOcrPayload } from "./ocr-payload";

const START_MS = 20000;
const SCAN_MS = 5000;

export class OcrWorker {
  private child: ChildProcess | null = null;
  private lines: readline.Interface | null = null;
  private waiting: ((line: string) => void) | null = null;
  private waitTimer: ReturnType<typeof setTimeout> | null = null;
  private buffer: string[] = [];
  private chain: Promise<unknown> = Promise.resolve();
  private lastErr = "";

  constructor(private readonly scriptPath: string) {}

  async warm(): Promise<void> {
    await this.ensure();
  }

  async scan(
    strip: PercentRect,
    hideOverlay = false,
  ): Promise<{ hasWindow: boolean; text: string; cardCount: number; hint: string }> {
    const run = this.chain.then(
      () => this.runScan(strip, hideOverlay),
      () => this.runScan(strip, hideOverlay),
    );
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  stop(): void {
    this.kill();
  }

  private async runScan(
    strip: PercentRect,
    hideOverlay: boolean,
  ): Promise<{ hasWindow: boolean; text: string; cardCount: number; hint: string }> {
    await this.ensure();
    const dir = await mkdtemp(path.join(os.tmpdir(), "pengu-ocr-"));
    const stamp = path.basename(dir);
    const textPath = path.join(dir, "card.txt");
    try {
      const status = await this.request(
        `SCAN|${strip.x}|${strip.y}|${strip.width}|${strip.height}|${hideOverlay ? "1" : "0"}|${stamp}`,
        SCAN_MS,
      );
      if (status === "NOWINDOW") return { hasWindow: false, text: "", cardCount: 0, hint: "" };
      if (status !== "OK") {
        this.warnFail(status.startsWith("ERR") ? status.slice(4) || "ERR" : status);
        return { hasWindow: true, text: "", cardCount: 0, hint: "" };
      }
      const page = pageFromOcrPayload(await readFile(textPath, "utf8"));
      return { hasWindow: true, text: page.text, cardCount: page.cardCount, hint: page.hint };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown";
      this.warnFail(reason);
      this.kill();
      return { hasWindow: false, text: "", cardCount: 0, hint: "" };
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private async ensure(): Promise<void> {
    if (this.child && this.lines) return;
    this.kill();
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", this.scriptPath],
      { windowsHide: true, stdio: ["pipe", "pipe", "ignore"] },
    );
    const lines = readline.createInterface({ input: child.stdout });
    this.child = child;
    this.lines = lines;
    lines.on("line", (line) => {
      const value = line.trim();
      if (!value) return;
      const wait = this.waiting;
      this.waiting = null;
      if (wait) {
        wait(value);
        return;
      }
      this.buffer.push(value);
    });
    child.on("exit", () => {
      if (this.child === child) this.kill();
    });
    const ready = await this.waitLine(START_MS);
    if (ready !== "READY") {
      this.kill();
      throw new Error("ocr worker failed to start");
    }
  }

  private request(command: string, timeoutMs: number): Promise<string> {
    const child = this.child;
    if (!child?.stdin) return Promise.reject(new Error("ocr worker is down"));
    const result = this.waitLine(timeoutMs);
    child.stdin.write(`${command}\n`);
    return result;
  }

  private waitLine(timeoutMs: number): Promise<string> {
    const queued = this.buffer.shift();
    if (queued) return Promise.resolve(queued);
    return new Promise((resolve, reject) => {
      this.waitTimer = setTimeout(() => {
        this.waitTimer = null;
        this.waiting = null;
        reject(new Error("ocr worker timeout"));
      }, timeoutMs);
      this.waiting = (line) => {
        if (this.waitTimer) clearTimeout(this.waitTimer);
        this.waitTimer = null;
        resolve(line);
      };
    });
  }

  private warnFail(reason: string): void {
    const text = reason.trim() || "ERR";
    if (text === this.lastErr) return;
    this.lastErr = text;
    try {
      process.stdout.write(`[pengu] 화면 읽기 실패: ${text}\n`);
    } catch {
      return;
    }
  }

  private kill(): void {
    if (this.waitTimer) {
      clearTimeout(this.waitTimer);
      this.waitTimer = null;
    }
    const wait = this.waiting;
    this.waiting = null;
    this.buffer = [];
    this.lines?.close();
    this.lines = null;
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
    if (wait) wait("ERR");
  }
}
