import { readFile } from "fs/promises";
import path from "path";
import { addScopeAccounts, listedScopeAccounts, removeScopeAccounts } from "../application/manage-scope";
import { lookupAlias } from "../infrastructure/collection/lcu-alias";
import { emptyScopeDocument, parseScopeContents, writeScopeFile } from "../infrastructure/collection/scope-file";

async function loadOrCreate(file: string, create: boolean) {
  try {
    return parseScopeContents(await readFile(path.resolve(file), "utf8")).document;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      if (create) return emptyScopeDocument();
      throw new Error("범위 파일이 없습니다.");
    }
    throw error;
  }
}

export async function runScopeCommand(file: string, action: string, ids: string[]) {
  if (action === "list") {
    if (ids.length) throw new Error("list는 추가 인자가 없습니다.");
    const document = await loadOrCreate(file, false);
    return { file: path.resolve(file), accounts: listedScopeAccounts(document) };
  }
  if (action !== "add" && action !== "remove") {
    throw new Error("scope 명령은 add, list, remove만 사용할 수 있습니다.");
  }
  if (!ids.length) throw new Error("닉네임#태그를 한 개 이상 입력하세요.");
  const document = await loadOrCreate(file, action === "add");
  const changed = action === "add"
    ? await addScopeAccounts(document, ids, { lookup: lookupAlias })
    : removeScopeAccounts(document, ids);
  await writeScopeFile(file, changed.document);
  return {
    file: path.resolve(file),
    results: changed.results,
    accounts: listedScopeAccounts(changed.document),
  };
}
