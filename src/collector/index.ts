import { mkdir } from "fs/promises";
import { homedir } from "os";
import path from "path";
import { parseArgs } from "util";
import { collectMatches } from "../application/collect-matches";
import { ArchiveSource } from "../infrastructure/collection/archive";
import { CurrentSource } from "../infrastructure/collection/current-source";
import { LcuChainSource } from "../infrastructure/collection/lcu-chain";
import { LcuHttpError } from "../infrastructure/lcu/request";
import { SqliteCollectionStore } from "../infrastructure/collection/sqlite-store";

const usage = `Pengu 통계 수집기
  current                     현재 로그인 계정의 최근 전적 수집
  chain <범위.json>           로그인 계정에서 시작해 허용된 참가자의 LCU 전적 탐색
  archive <폴더> <시드 해시>  로컬 자료에서 참가자 연결 탐색
  resume                      저장된 대기 작업 재개
  status                      진행 상황과 제외 사유
  stats [패치]                패치 목록 또는 해당 패치의 경기·챔피언·증강 집계
  abandon                     남은 대기 작업 폐기 (완료한 경기는 보존)
  --db <파일>                 SQLite 경로 지정`;

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true, options: { db: { type: "string" }, help: { type: "boolean" } },
  });
  const [command, ...args] = positionals;
  if (values.help || !command) { console.log(usage); return; }
  const counts: Record<string, number> = { current: 0, chain: 1, archive: 2, resume: 0, status: 0, stats: 1, abandon: 0 };
  if (!Object.hasOwn(counts, command) || (command === "stats" ? args.length > 1 : args.length !== counts[command])) {
    throw new Error(usage);
  }
  if (command === "archive" && !/^[a-f0-9]{64}$/.test(args[1])) throw new Error("64자리 시드 해시가 필요합니다.");
  const file = path.resolve(values.db ?? path.join(process.env.LOCALAPPDATA ?? homedir(), "PenguCollector", "matches.sqlite"));
  await mkdir(path.dirname(file), { recursive: true });
  const store = new SqliteCollectionStore(file);
  const print = (value: unknown) => console.log(JSON.stringify(value, null, 2));
  const interrupt = new AbortController();
  const stop = () => interrupt.abort();
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    if (command === "status") { print(store.progress()); return; }
    if (command === "stats") { print(args[0] ? store.stats(args[0]) : store.patches()); return; }
    if (command === "abandon") { store.abandon(); print(store.progress()); return; }
    const previous = store.current();
    const resume = command === "resume";
    if (resume && !previous?.active) throw new Error("재개할 작업이 없습니다.");
    if (!resume && previous?.active) throw new Error("진행 중인 작업이 있습니다. resume 또는 abandon을 사용하세요.");
    const kind = resume ? previous!.source : command;
    let source;
    let location = "";
    let seed;
    if (kind === "archive") {
      location = resume ? previous!.location : path.resolve(args[0]);
      seed = resume ? previous!.seed : args[1];
      source = new ArchiveSource(location);
      await source.checkSeed(seed, resume);
    } else if (kind === "chain") {
      source = resume ? await LcuChainSource.resume(store, previous!.location, interrupt.signal)
        : await LcuChainSource.connect(store, args[0], interrupt.signal);
      seed = source.owner;
      location = source.location;
    } else {
      source = await CurrentSource.connect(store);
      seed = source.owner;
    }
    if (resume && seed !== previous!.seed) throw new Error("시작 계정으로 로그인한 뒤 재개하세요.");
    const run = resume ? previous!.id : store.start(kind === "archive" || kind === "chain" ? kind : "current", location, seed);
    store.setState(run, "running");
    try {
      await collectMatches(source, store, run, () => interrupt.signal.aborted);
      if (interrupt.signal.aborted) store.setState(run, "paused");
    } catch (error) {
      if (interrupt.signal.aborted && error instanceof Error && error.name === "AbortError") {
        store.setState(run, "paused");
        print(store.progress());
        return;
      }
      store.setState(run, error instanceof LcuHttpError ? "HTTP " + error.status : "interrupted");
      throw error;
    }
    print(store.progress());
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    store.close();
  }
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : "수집에 실패했습니다.");
  process.exitCode = 1;
});
