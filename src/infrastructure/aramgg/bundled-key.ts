import { readFileSync } from "fs";
import path from "path";

export function readBundledKey(appRoot: string): string {
  const candidates = [
    path.join(appRoot, "secrets", "aramgg-key.txt"),
    path.join(process.cwd(), "secrets", "aramgg-key.txt"),
  ];

  for (const filePath of candidates) {
    try {
      const value = readFileSync(filePath, "utf8").trim();
      if (value && !value.startsWith("여기에")) return value;
    } catch {
      // try next location
    }
  }

  return process.env.PENGU_ARAMGG_KEY?.trim() ?? "";
}
