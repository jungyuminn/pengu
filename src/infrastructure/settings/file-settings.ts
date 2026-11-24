import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { AppSettings, SettingsStore } from "../../application/ports";
import { asThemeMode } from "../../domain/theme";

const DEFAULTS: AppSettings = {
  apiKey: "",
  overlayEnabled: true,
  overlayScale: 1,
  theme: "dark",
};

export class FileSettingsStore implements SettingsStore {
  constructor(private readonly filePath: string) {}

  async read(): Promise<AppSettings> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return { ...DEFAULTS, ...parsed, theme: asThemeMode(parsed.theme) };
    } catch {
      return { ...DEFAULTS };
    }
  }

  async write(settings: AppSettings): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(settings, null, 2), "utf8");
  }
}
