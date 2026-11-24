import type { ChampionDetail } from "../../domain/champion-detail";
import type { BulkProgress, ChampionDetailCatalog } from "../../application/ports";
import { getJson } from "../http";
import { fetchClientLookup, type ClientLookup } from "./client-lookup";
import { mapChampionDetail } from "./detail-mapper";
import { fetchChampionDetailsBulk } from "./shard-client";

const CONFIG_URL = "https://data.dtodo.cn/api/client/v1/config";
const DATA_BASE = "https://data.dtodo.cn/api/client/v1/data";

interface ClientConfig {
  dataVersion?: string;
}

export class AramggChampionDetails implements ChampionDetailCatalog {
  private dataVersion: string | null = null;
  private lookup: ClientLookup | null = null;

  async warm(): Promise<void> {
    await this.ensureLookup().catch(() => undefined);
  }

  async fetch(championId: number): Promise<ChampionDetail> {
    const version = await this.version();
    const lookup = await this.ensureLookup();
    const payload = await getJson<Parameters<typeof mapChampionDetail>[0]>(
      `${DATA_BASE}/${version}/champions/${championId}.json`,
    );
    return mapChampionDetail(payload, lookup);
  }

  async fetchBulk(ids: number[], onProgress?: BulkProgress): Promise<ChampionDetail[]> {
    const version = await this.version();
    return fetchChampionDetailsBulk(version, ids, await this.ensureLookup(), onProgress);
  }

  private async version(): Promise<string> {
    if (this.dataVersion) return this.dataVersion;
    const config = await getJson<ClientConfig>(CONFIG_URL);
    if (!config.dataVersion) {
      throw new Error("aramgg 데이터 버전을 받지 못했습니다.");
    }
    this.dataVersion = config.dataVersion;
    return this.dataVersion;
  }

  private async ensureLookup(): Promise<ClientLookup> {
    if (this.lookup) return this.lookup;
    this.lookup = await fetchClientLookup(await this.version());
    return this.lookup;
  }
}
