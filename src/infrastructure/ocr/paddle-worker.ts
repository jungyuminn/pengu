import { parentPort } from "worker_threads";

type InitMsg = {
  id: number;
  type: "init";
  models: { detectionPath: string; recognitionPath: string; dictionaryPath: string };
};

type ReadMsg = {
  id: number;
  type: "read";
  width: number;
  height: number;
  data: Uint8Array;
};

type OcrSession = {
  detect(image: { data: Uint8Array; width: number; height: number }): Promise<{
    texts: Array<{ text: string; mean: number; box?: number[][] }>;
  }>;
};

let session: OcrSession | null = null;

parentPort?.on("message", (message: InitMsg | ReadMsg) => {
  void handle(message);
});

async function handle(message: InitMsg | ReadMsg): Promise<void> {
  try {
    if (message.type === "init") {
      const mod = (await loadGutenOcr()) as {
        default: { create: (options: { models: InitMsg["models"] }) => Promise<OcrSession> };
      };
      session = await mod.default.create({ models: message.models });
      parentPort?.postMessage({ id: message.id, ok: true });
      return;
    }
    if (!session) throw new Error("ocr worker not ready");
    const result = await session.detect({
      data: message.data,
      width: message.width,
      height: message.height,
    });
    parentPort?.postMessage({
      id: message.id,
      ok: true,
      texts: (result.texts ?? []).map((line) => ({
        text: String(line.text ?? "").trim(),
        score: Number(line.mean) || 0,
        box: Array.isArray(line.box) ? line.box : undefined,
      })),
    });
  } catch (error) {
    parentPort?.postMessage({
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

function loadGutenOcr(): Promise<unknown> {
  return new Function("return import('@gutenye/ocr-node')")() as Promise<unknown>;
}
