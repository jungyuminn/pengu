import type { MayhemHistorySource } from "../../application/ports";
import { hasMayhemBoard, type MayhemMatch, type MayhemProfile } from "../../domain/mayhem";
import { gamesFromList, mapMayhemGame, mayhemGameId, summonerName, type LcuMatchList, type LcuSummoner } from "./match-mapper";
import { lcuGetJson } from "./request";

const PAGE_SIZE = 20;

export class LcuMayhemHistory implements MayhemHistorySource {
  async fetchRecent(knownIds: ReadonlySet<number>, pages: number): Promise<MayhemProfile | null> {
    const summoner = summonerName((await lcuGetJson<LcuSummoner>("/lol-summoner/v1/current-summoner")) ?? {});
    if (!summoner) return null;

    const matches: MayhemMatch[] = [];
    const seen = new Set<number>();
    for (let page = 0; page < Math.max(1, pages); page += 1) {
      const begin = page * PAGE_SIZE;
      const list = await lcuGetJson<LcuMatchList>(
        `/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=${begin}&endIndex=${begin + PAGE_SIZE - 1}`,
      );
      const games = gamesFromList(list);
      if (!games.length) break;
      for (const raw of games) {
        const match = await this.resolveMatch(raw, summoner.puuid, knownIds);
        if (!match || seen.has(match.gameId)) continue;
        seen.add(match.gameId);
        matches.push(match);
      }
    }

    return { ...summoner, matches };
  }

  private async resolveMatch(
    raw: unknown,
    puuid: string,
    knownIds: ReadonlySet<number>,
  ): Promise<MayhemMatch | null> {
    const listed = mapMayhemGame(raw, puuid);
    if (hasMayhemBoard(listed)) return listed;
    const gameId = listed?.gameId ?? mayhemGameId(raw);
    if (!gameId || knownIds.has(gameId)) return listed;
    const detail = await lcuGetJson<unknown>(`/lol-match-history/v1/games/${gameId}`);
    return mapMayhemGame(detail, puuid) ?? listed;
  }
}
