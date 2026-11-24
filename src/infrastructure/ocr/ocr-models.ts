import { createHash } from "crypto";
import { createReadStream, createWriteStream } from "fs";
import { mkdir, rename, stat } from "fs/promises";
import http from "http";
import https from "https";
import path from "path";

const BASE = "https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.10.0";

export interface OcrModelFiles {
  detectionPath: string;
  recognitionPath: string;
  dictionaryPath: string;
}

const FILES = [
  {
    name: "ch_PP-OCRv5_det_mobile.onnx",
    url: `${BASE}/onnx/PP-OCRv5/det/ch_PP-OCRv5_det_mobile.onnx`,
    sha256: "4d97c44a20d30a81aad087d6a396b08f786c4635742afc391f6621f5c6ae78ae",
    key: "detectionPath" as const,
  },
  {
    name: "korean_PP-OCRv5_rec_mobile.onnx",
    url: `${BASE}/onnx/PP-OCRv5/rec/korean_PP-OCRv5_rec_mobile.onnx`,
    sha256: "cd6e2ea50f6943ca7271eb8c56a877a5a90720b7047fe9c41a2e541a25773c9b",
    key: "recognitionPath" as const,
  },
  {
    name: "ppocrv5_korean_dict.txt",
    url: `${BASE}/paddle/PP-OCRv5/rec/korean_PP-OCRv5_rec_mobile/ppocrv5_korean_dict.txt`,
    sha256: "",
    key: "dictionaryPath" as const,
  },
];

export async function ensureOcrModels(modelDir: string): Promise<OcrModelFiles> {
  await mkdir(modelDir, { recursive: true });
  const paths: OcrModelFiles = {
    detectionPath: "",
    recognitionPath: "",
    dictionaryPath: "",
  };
  for (const file of FILES) {
    const dest = path.join(modelDir, file.name);
    if (!(await isReady(dest, file.sha256))) {
      say(`한글 인식 모델 받는 중: ${file.name}`);
      await downloadFile(file.url, dest);
      if (file.sha256 && !(await isReady(dest, file.sha256))) {
        throw new Error(`ocr model checksum failed: ${file.name}`);
      }
    }
    paths[file.key] = dest;
  }
  return paths;
}

async function isReady(filePath: string, sha256: string): Promise<boolean> {
  try {
    const info = await stat(filePath);
    if (!info.isFile() || info.size < 32) return false;
    if (!sha256) return true;
    const hash = createHash("sha256");
    await new Promise<void>((resolve, reject) => {
      const stream = createReadStream(filePath);
      stream.on("data", (chunk) => hash.update(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve());
    });
    return hash.digest("hex") === sha256;
  } catch {
    return false;
  }
}

function downloadFile(url: string, dest: string): Promise<void> {
  const tmp = `${dest}.part`;
  return new Promise((resolve, reject) => {
    const get = (current: string, hops: number) => {
      if (hops > 8) {
        reject(new Error("ocr model redirect loop"));
        return;
      }
      const client = current.startsWith("http://") ? http : https;
      const req = client.get(
        current,
        { headers: { "User-Agent": "pengu-ocr" } },
        (res) => {
          const code = res.statusCode ?? 0;
          const next = res.headers.location;
          if (code >= 300 && code < 400 && next) {
            res.resume();
            get(new URL(next, current).href, hops + 1);
            return;
          }
          if (code !== 200) {
            res.resume();
            reject(new Error(`ocr model download ${code}`));
            return;
          }
          const out = createWriteStream(tmp);
          res.pipe(out);
          out.on("finish", () => {
            out.close(() => {
              rename(tmp, dest).then(() => resolve(), reject);
            });
          });
          out.on("error", reject);
        },
      );
      req.on("error", reject);
    };
    get(url, 0);
  });
}

function say(message: string): void {
  try {
    process.stdout.write(`[pengu] ${message}\n`);
  } catch {
    return;
  }
}
