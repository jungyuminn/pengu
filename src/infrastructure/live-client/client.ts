import https from "https";
import type { LiveGame, LiveGameReader } from "../../application/ports";
import { liveGameFromPayload, type LivePayload } from "./map-board";

const CACHE_MS = 350;

export class LiveClientReader implements LiveGameReader {
  private cached: { at: number; payload: LivePayload | null } | null = null;

  async read(): Promise<LiveGame | null> {
    const payload = await this.load();
    return payload ? liveGameFromPayload(payload) : null;
  }

  private async load(): Promise<LivePayload | null> {
    if (this.cached && Date.now() - this.cached.at < CACHE_MS) return this.cached.payload;
    const payload = await liveGet<LivePayload>("/liveclientdata/allgamedata").catch(() => null);
    this.cached = { at: Date.now(), payload };
    return payload;
  }
}

function liveGet<T>(pathname: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "127.0.0.1",
        port: 2999,
        path: pathname,
        method: "GET",
        rejectUnauthorized: false,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(chunk as Buffer));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (!response.statusCode || response.statusCode >= 400) {
            reject(new Error(`live client ${response.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(body) as T);
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.setTimeout(800, () => {
      request.destroy();
      reject(new Error("live client timeout"));
    });
    request.on("error", reject);
    request.end();
  });
}
