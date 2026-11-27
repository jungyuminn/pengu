import { randomUUID } from "crypto";
import type { DatabaseSync } from "node:sqlite";
import type { CollectionStore, WorkItem, WorkResult } from "../../application/collect-matches";
import type { MatchSample } from "../../domain/collection-match";

export interface CollectionRun {
  id: string;
  source: "archive" | "current" | "chain";
  location: string;
  seed: string;
  active: number;
}

const schema = `
  CREATE TABLE run(id TEXT PRIMARY KEY, source TEXT NOT NULL, location TEXT NOT NULL, seed TEXT NOT NULL,
    active INTEGER NOT NULL, state TEXT DEFAULT 'running', processed INTEGER DEFAULT 0, added INTEGER DEFAULT 0, duplicates INTEGER DEFAULT 0,
    missing INTEGER DEFAULT 0, invalid INTEGER DEFAULT 0, repeated_refs INTEGER DEFAULT 0);
  CREATE TABLE jobs(id INTEGER PRIMARY KEY, kind TEXT NOT NULL, ref TEXT NOT NULL, page INTEGER NOT NULL,
    done INTEGER NOT NULL DEFAULT 0, UNIQUE(kind,ref,page));
  CREATE INDEX pending_jobs ON jobs(id) WHERE done=0;
  CREATE TABLE chain_peers(ref TEXT PRIMARY KEY, puuid TEXT NOT NULL) WITHOUT ROWID;
  CREATE TABLE rejections(reason TEXT PRIMARY KEY, total INTEGER NOT NULL);
  CREATE TABLE matches(platform TEXT NOT NULL, game_id INTEGER NOT NULL, version TEXT NOT NULL, patch TEXT NOT NULL,
    PRIMARY KEY(platform,game_id)) WITHOUT ROWID;
  CREATE INDEX patch_games ON matches(patch);
  CREATE TABLE players(platform TEXT NOT NULL, game_id INTEGER NOT NULL, participant INTEGER NOT NULL,
    team INTEGER NOT NULL, champion INTEGER NOT NULL, win INTEGER NOT NULL, PRIMARY KEY(platform,game_id,participant),
    FOREIGN KEY(platform,game_id) REFERENCES matches) WITHOUT ROWID;
  CREATE TABLE augments(platform TEXT NOT NULL, game_id INTEGER NOT NULL, participant INTEGER NOT NULL,
    slot INTEGER NOT NULL, augment INTEGER NOT NULL, PRIMARY KEY(platform,game_id,participant,slot),
    FOREIGN KEY(platform,game_id,participant) REFERENCES players) WITHOUT ROWID;
  CREATE TABLE lcu_limit(id INTEGER PRIMARY KEY, next_call INTEGER NOT NULL, blocked_until INTEGER NOT NULL);
  INSERT INTO lcu_limit VALUES (1,0,0);
  PRAGMA user_version=2;`;

export class SqliteCollectionStore implements CollectionStore {
  private readonly db: DatabaseSync;

  constructor(file: string) {
    const sqlite = process.getBuiltinModule?.("node:sqlite") as typeof import("node:sqlite") | undefined;
    if (!sqlite) throw new Error("독립 수집기에는 node:sqlite를 지원하는 Node.js가 필요합니다 (검증 버전 24).");
    this.db = new sqlite.DatabaseSync(file);
    try {
      this.db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA secure_delete=ON");
      this.transaction(() => {
        const version = this.db.prepare("PRAGMA user_version").get()?.user_version;
        const hasLimit = Boolean(this.db.prepare("SELECT 1 FROM sqlite_schema WHERE name='lcu_limit'").get());
        if (version === 0 && !this.db.prepare("SELECT 1 FROM sqlite_schema WHERE type='table'").get()) {
          this.db.exec(schema);
        } else if (version === 1 && hasLimit) {
          this.db.exec(`
            CREATE TABLE IF NOT EXISTS chain_peers(ref TEXT PRIMARY KEY, puuid TEXT NOT NULL) WITHOUT ROWID;
            PRAGMA user_version=2;
          `);
        } else if (version !== 2 || !hasLimit || !this.db.prepare("SELECT 1 FROM sqlite_schema WHERE name='chain_peers'").get()) {
          throw new Error("지원하지 않는 수집 DB입니다.");
        }
      });
    } catch (error) {
      this.db.close();
      throw error;
    }
  }

  close() { this.db.close(); }

  private transaction<T>(work: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = work();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  rememberPeers(entries: ReadonlyArray<readonly [ref: string, puuid: string]>) {
    if (!entries.length) return;
    this.transaction(() => {
      const insert = this.db.prepare("INSERT OR IGNORE INTO chain_peers(ref,puuid) VALUES(?,?)");
      for (const [ref, puuid] of entries) {
        if (ref && puuid) insert.run(ref, puuid);
      }
    });
  }

  lookupPuuid(ref: string): string | undefined {
    const row = this.db.prepare("SELECT puuid FROM chain_peers WHERE ref=?").get(ref) as { puuid?: string } | undefined;
    return row?.puuid;
  }

  current(): CollectionRun | undefined {
    return this.db.prepare("SELECT * FROM run").get() as unknown as CollectionRun | undefined;
  }

  start(source: CollectionRun["source"], location: string, seed: string): string {
    return this.transaction(() => {
      if (this.current()?.active) throw new Error("미완료 수집이 있습니다. resume으로 이어서 실행하세요.");
      this.db.exec("DELETE FROM run; DELETE FROM rejections; DELETE FROM chain_peers");
      const id = randomUUID();
      this.db.prepare("INSERT INTO run(id,source,location,seed,active) VALUES(?,?,?,?,1)").run(id,source,location,seed);
      this.enqueue("history", seed, 0);
      return id;
    });
  }

  private enqueue(kind: WorkItem["kind"], ref: string, page: number) {
    return this.db.prepare("INSERT INTO jobs(kind,ref,page) VALUES(?,?,?) ON CONFLICT DO NOTHING").run(kind,ref,page).changes;
  }

  next(run: string): WorkItem | null {
    const row = this.db.prepare(`SELECT jobs.id,run.id AS run,kind,ref,page FROM jobs,run
      WHERE run.id=? AND active=1 AND done=0 ORDER BY jobs.id LIMIT 1`).get(run);
    return row ? row as unknown as WorkItem : null;
  }

  complete(job: WorkItem, result: WorkResult) {
    this.transaction(() => {
      if (this.current()?.id !== job.run) return;
      if (!this.db.prepare("UPDATE jobs SET done=1 WHERE id=? AND done=0").run(job.id).changes) return;
      let counter: "duplicates" | "added" | "invalid" | "missing" | undefined;
      switch (result.type) {
        case "page": {
          let repeated = 0;
          for (const id of result.page.gameIds) {
            if (!this.enqueue("detail", String(id), 0)) repeated++;
          }
          this.db.prepare("UPDATE run SET repeated_refs=repeated_refs+?").run(repeated);
          if (result.page.nextPage !== null) this.enqueue("history", job.ref, result.page.nextPage);
          break;
        }
        case "match":
          counter = this.save(result.sample, result.patch) ? "added" : "duplicates";
          for (const account of result.accounts) this.enqueue("history", account, 0);
          break;
        case "invalid":
          counter = "invalid";
          this.db.prepare(`INSERT INTO rejections VALUES(?,1)
            ON CONFLICT(reason) DO UPDATE SET total=total+1`).run(result.reason);
          break;
        case "missing":
          counter = "missing";
          break;
      }
      this.db.exec("UPDATE run SET processed=processed+1" + (counter ? `, ${counter}=${counter}+1` : ""));
    });
  }

  private save(game: MatchSample, patch: string): boolean {
    const { platform, gameId } = game;
    const inserted = this.db.prepare("INSERT INTO matches VALUES(?,?,?,?) ON CONFLICT DO NOTHING")
      .run(platform, gameId, game.version, patch);
    if (!inserted.changes) return false;
    const player = this.db.prepare("INSERT INTO players VALUES(?,?,?,?,?,?)");
    const augment = this.db.prepare("INSERT INTO augments VALUES(?,?,?,?,?)");
    for (const p of game.players) {
      player.run(platform, gameId, p.participantId, p.teamId, p.championId, Number(p.win));
      p.augments.forEach((id, index) => {
        if (id !== null) augment.run(platform, gameId, p.participantId, index + 1, id);
      });
    }
    return true;
  }

  finish(run: string) {
    this.transaction(() => {
      if (this.current()?.id !== run || this.next(run)) return;
      this.db.exec(`DELETE FROM jobs; DELETE FROM chain_peers; UPDATE run SET active=0,seed='',state='completed',
        location=CASE WHEN source='chain' THEN '' ELSE location END WHERE active=1`);
    });
  }

  progress() {
    const run = this.db.prepare("SELECT source,state,active,processed,added,duplicates,repeated_refs,missing,invalid FROM run").get();
    return {
      run: run ?? null,
      pending: this.db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE done=0").get()?.n,
      rejections: this.db.prepare("SELECT * FROM rejections ORDER BY reason").all(),
      blockedUntil: this.db.prepare("SELECT blocked_until FROM lcu_limit WHERE blocked_until > ?").get(Date.now())?.blocked_until ?? null,
    };
  }

  abandon() {
    this.transaction(() => {
      this.db.exec(`DELETE FROM jobs; DELETE FROM chain_peers; UPDATE run SET active=0,seed='',state='abandoned',
        location=CASE WHEN source='chain' THEN '' ELSE location END WHERE active=1`);
    });
  }

  setState(run: string, state: string) {
    this.db.prepare("UPDATE run SET state=? WHERE id=? AND active=1").run(state, run);
  }

  patches() {
    return this.db.prepare("SELECT patch, COUNT(*) AS games FROM matches GROUP BY patch ORDER BY patch").all();
  }

  stats(patch: string) {
    return {
      patch,
      games: this.db.prepare("SELECT COUNT(*) AS n FROM matches WHERE patch=?").get(patch)?.n,
      champions: this.db.prepare(`SELECT champion, COUNT(*) AS appearances, SUM(win) AS wins FROM players
        JOIN matches USING(platform,game_id) WHERE patch=? GROUP BY champion ORDER BY champion`).all(patch),
      augments: this.db.prepare(`SELECT champion, augment, COUNT(*) AS holders FROM (
        SELECT DISTINCT platform,game_id,participant,champion,augment FROM augments
        JOIN players USING(platform,game_id,participant) JOIN matches USING(platform,game_id) WHERE patch=?
        ) GROUP BY champion,augment ORDER BY champion,augment`).all(patch),
    };
  }

  reserveRequest(minIntervalMs = 1000): number {
    return this.transaction(() => {
      const row = this.db.prepare("SELECT next_call,blocked_until FROM lcu_limit WHERE id=1").get()!;
      const now = Date.now();
      if (Number(row.blocked_until) > now) throw new Error("LCU 요청 대기 중: " + new Date(Number(row.blocked_until)).toISOString());
      const delay = Number(row.next_call) - now;
      if (delay > 0) return delay;
      this.db.prepare("UPDATE lcu_limit SET next_call=? WHERE id=1").run(now + minIntervalMs);
      return 0;
    });
  }

  blockUntil(time: number) {
    this.db.prepare("UPDATE lcu_limit SET blocked_until=MAX(blocked_until,?) WHERE id=1").run(time);
  }
}
