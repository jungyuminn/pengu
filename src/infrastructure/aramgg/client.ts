import type { StatsSnapshot } from "../../domain/augment";
import type { RemoteCatalog } from "../../application/ports";
import { getJson } from "../http";
import { mapAramggChampions } from "./champion-mapper";
import { mapAramggAugments } from "./mapper";

const API_BASE = "https://data.dtodo.cn/api/v1";
const LOCALES = ["ko", "zh-CN", "en"] as const;

export const ARAMGG_DEVELOPER_URL = "https://data.dtodo.cn/developer.html";

export class AramggCatalog implements RemoteCatalog {
  constructor(private readonly apiKey: string) {}

  async fetch(): Promise<StatsSnapshot> {
    if (!this.apiKey.trim()) {
      throw new Error("aramgg API 키가 없습니다.");
    }

    let lastError: unknown;
    for (const locale of LOCALES) {
      try {
        return await this.fetchLocale(locale);
      } catch (error) {
        if (isAuthFailure(error)) throw error;
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error("aramgg 통계를 받지 못했습니다.");
  }

  private async fetchLocale(locale: (typeof LOCALES)[number]): Promise<StatsSnapshot> {
    const headers = { Authorization: `Bearer ${this.apiKey}` };
    const [augments, champions] = await Promise.all([
      getJson<Parameters<typeof mapAramggAugments>[0]>(`${API_BASE}/${locale}/augments.json`, headers),
      getJson<Parameters<typeof mapAramggChampions>[0]>(
        `${API_BASE}/${locale}/champions.json`,
        headers,
      ).catch(() => null),
    ]);
    const snapshot = mapAramggAugments(augments, new Date().toISOString());
    return champions ? { ...snapshot, champions: mapAramggChampions(champions) } : snapshot;
  }
}

function isAuthFailure(error: unknown): boolean {
  return error instanceof Error && /\b(401|403)\b/.test(error.message);
}
