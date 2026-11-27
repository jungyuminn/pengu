import type { CollectionSource } from "../../application/collect-matches";
import { gamesFromList, mayhemGameId, type LcuMatchList } from "../lcu/match-mapper";
import { LcuHttpError } from "../lcu/request";
import { accountRef, lcuSample } from "./lcu-sample";
import { connectCollectionLcu, type RequestBudget } from "./lcu-session";

export class CurrentSource implements CollectionSource {
  constructor(readonly owner: string, private readonly read: (path: string) => Promise<unknown>) {}

  static async connect(budget: RequestBudget): Promise<CurrentSource> {
    const session = await connectCollectionLcu(budget);
    return new CurrentSource(accountRef(session.puuid), session.read);
  }

  async history(account: string, page: number) {
    if (account !== this.owner) return null;
    const begin = page * 20;
    const list = await this.read(
      `/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=${begin}&endIndex=${begin + 19}`,
    ) as LcuMatchList | null;
    if (!Array.isArray(list?.games) && !Array.isArray(list?.games?.games)) throw new Error("전적 목록 형식을 확인할 수 없습니다.");
    const rows = gamesFromList(list);
    return { gameIds: rows.flatMap(row => mayhemGameId(row) ?? []), nextPage: page < 4 && rows.length === 20 ? page + 1 : null };
  }

  async detail(gameId: number) {
    try {
      return lcuSample(await this.read(`/lol-match-history/v1/games/${gameId}`), this.owner);
    } catch (error) {
      if (error instanceof LcuHttpError && error.status === 404) return null;
      throw error;
    }
  }
}

