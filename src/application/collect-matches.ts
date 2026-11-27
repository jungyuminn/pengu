import { InvalidSample, positiveId, samplePatch, type MatchSample } from "../domain/collection-match";

export interface HistoryPage {
  gameIds: number[];
  nextPage: number | null;
}

export interface CollectionSource {
  history(account: string, page: number): Promise<HistoryPage | null>;
  detail(gameId: number): Promise<{ sample: MatchSample; accounts: string[] } | null>;
}

export interface WorkItem {
  id: number;
  run: string;
  kind: "history" | "detail";
  ref: string;
  page: number;
}

export type WorkResult =
  | { type: "page"; page: HistoryPage }
  | { type: "match"; sample: MatchSample; patch: string; accounts: string[] }
  | { type: "missing" }
  | { type: "invalid"; reason: string };

export interface CollectionStore {
  next(run: string): WorkItem | null;
  complete(job: WorkItem, result: WorkResult): void;
  finish(run: string): void;
}

export async function collectMatches(
  source: CollectionSource, store: CollectionStore, run: string, stopping = () => false,
): Promise<void> {
  while (!stopping()) {
    const job = store.next(run);
    if (!job) {
      store.finish(run);
      return;
    }
    let result: WorkResult;
    try {
      if (job.kind === "history") {
        const page = await source.history(job.ref, job.page);
        if (page && (!page.gameIds.every(positiveId) || (page.nextPage !== null &&
          (!Number.isSafeInteger(page.nextPage) || page.nextPage <= job.page)))) {
          throw new InvalidSample("history-page");
        }
        result = page ? { type: "page", page } : { type: "missing" };
      } else {
        const gameId = Number(job.ref);
        const detail = await source.detail(gameId);
        result = detail ? { type: "match", ...detail, patch: samplePatch(detail.sample, gameId) } : { type: "missing" };
      }
    } catch (error) {
      if (!(error instanceof InvalidSample)) throw error;
      result = { type: "invalid", reason: error.message };
    }
    store.complete(job, result);
  }
}
