const fs = require("fs");
const path = require("path");

const OUT = path.join(process.cwd(), "assets/spells");
const INDEX = path.join(OUT, "index.json");

void main();

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const versions = await getJson("https://ddragon.leagueoflegends.com/api/versions.json");
  const version = versions[0];
  if (!version) {
    process.exitCode = 1;
    return;
  }
  const [en, ko, zh] = await Promise.all([
    getJson(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/summoner.json`),
    getJson(`https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/summoner.json`),
    getJson(`https://ddragon.leagueoflegends.com/cdn/${version}/data/zh_CN/summoner.json`),
  ]);

  const rows = [];
  let saved = 0;
  let skipped = 0;
  let failed = 0;

  for (const [code, row] of Object.entries(en.data ?? {})) {
    const id = Number(row.key);
    const image = row.image?.full;
    const file = spellFileName(row.name || code);
    if (!Number.isFinite(id) || id <= 0 || !image || !file) continue;
    const dest = path.join(OUT, file);
    const names = [row.name, ko.data?.[code]?.name, zh.data?.[code]?.name, code].filter(Boolean);
    rows.push({ id, file, names: [...new Set(names)] });
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
      skipped += 1;
      continue;
    }
    try {
      await download(`https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${image}`, dest);
      saved += 1;
    } catch {
      failed += 1;
    }
  }

  fs.writeFileSync(INDEX, `${JSON.stringify(rows, null, 2)}\n`);
  console.log(`spell icons: ${saved} saved, ${skipped} kept, ${failed} failed (${rows.length} spells)`);
  if (rows.length === 0 || saved + skipped === 0) process.exitCode = 1;
}

function spellFileName(name) {
  const file = String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .concat(".png");
  return file === ".png" ? "" : file;
}

async function download(url, file) {
  let lastError = new Error(url);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "Pengu" } });
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 32) throw new Error(`empty ${url}`);
      fs.writeFileSync(file, buffer);
      return;
    } catch (error) {
      lastError = error;
      await wait(400 * (attempt + 1));
    }
  }
  throw lastError;
}

async function getJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": "Pengu" } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
