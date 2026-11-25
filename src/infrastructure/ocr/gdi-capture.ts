import { execFile } from "child_process";
import { mkdtemp, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function captureRegion(
  scriptPath: string,
  rect: { x: number; y: number; width: number; height: number },
): Promise<Buffer> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "pengu-gdi-"));
  const imagePath = path.join(dir, "strip.png");
  try {
    await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,
        "-X",
        String(Math.round(rect.x)),
        "-Y",
        String(Math.round(rect.y)),
        "-Width",
        String(Math.max(8, Math.round(rect.width))),
        "-Height",
        String(Math.max(8, Math.round(rect.height))),
        "-OutFile",
        imagePath,
      ],
      { windowsHide: true, timeout: 2500 },
    );
    return await readFile(imagePath);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
