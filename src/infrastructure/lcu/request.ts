import https from "https";
import { readLockfile, type Lockfile } from "./lockfile";

export class LcuHttpError extends Error {
  constructor(readonly status: number, readonly retryAfter?: string) {
    super(`LCU ${status}`);
  }
}

export async function lcuGetJson<T>(pathname: string): Promise<T | null> {
  const lockfile = await readLockfile();
  if (!lockfile) return null;
  try {
    return await lcuRequest<T>(lockfile, pathname);
  } catch {
    return null;
  }
}

export function lcuRequest<T>(
  lockfile: Lockfile,
  pathname: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = Buffer.from(`riot:${lockfile.password}`).toString("base64");
  const method = options.method ?? "GET";
  const payload = options.body === undefined ? undefined : JSON.stringify(options.body);
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "127.0.0.1",
        port: lockfile.port,
        path: pathname,
        method,
        rejectUnauthorized: false,
        headers: {
          Authorization: `Basic ${token}`,
          ...(payload
            ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
            : {}),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk) => chunks.push(chunk as Buffer));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (!response.statusCode || response.statusCode >= 400) {
            reject(new LcuHttpError(response.statusCode ?? 0, response.headers["retry-after"]));
            return;
          }
          if (!body.trim()) {
            resolve({} as T);
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
    request.setTimeout(1200, () => {
      request.destroy();
      reject(new Error("LCU timeout"));
    });
    request.on("error", reject);
    request.end(payload);
  });
}
