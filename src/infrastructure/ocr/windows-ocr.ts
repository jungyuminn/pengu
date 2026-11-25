import { execFile } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function recognizePng(png: Buffer, scriptPath: string): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "pengu-ocr-"));
  const imagePath = path.join(dir, "card.png");
  const textPath = path.join(dir, "card.txt");
  try {
    await writeFile(imagePath, png);
    await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,
        "-ImagePath",
        imagePath,
        "-OutText",
        textPath,
      ],
      { windowsHide: true, timeout: 15000 },
    );
    return (await readFile(textPath, "utf8")).trim();
  } catch {
    return "";
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
