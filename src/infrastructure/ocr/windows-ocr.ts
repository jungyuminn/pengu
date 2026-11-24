import { execFile } from "child_process";
import { mkdtemp, writeFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function recognizePng(png: Buffer, scriptPath: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "pengu-ocr-"));
  const imagePath = path.join(dir, "card.png");
  try {
    await writeFile(imagePath, png);
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-ImagePath", imagePath],
      { windowsHide: true, timeout: 8000 },
    );
    return stdout.trim();
  } catch {
    return "";
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
