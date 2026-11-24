const fs = require("fs");
const path = require("path");

const OUT = path.join(process.cwd(), "assets/items");
const INDEX = path.join(OUT, "index.json");
const CONCURRENCY = 8;

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
    getJson(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`),
    getJson(`https://ddragon.leagueoflegends.com/cdn/${version}/data/ko_KR/item.json`),
    getJson(`https://ddragon.leagueoflegends.com/cdn/${version}/data/zh_CN/item.json`),
  ]);

  const used = new Set();
  const rows = [];
  const jobs = [];

  for (const [code, row] of Object.entries(en.data ?? {})) {
    const id = Number(code);
    const image = row.image?.full;
    if (!Number.isFinite(id) || id <= 0 || !image) continue;
    const file = uniqueFile(row.name || `item${id}`, id, used);
    const names = [row.name, ko.data?.[code]?.name, zh.data?.[code]?.name].filter(Boolean);
    rows.push({ id, file, names: [...new Set(names)] });
    jobs.push({
      file: path.join(OUT, file),
      url: `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${image}`,
    });
  }

  let saved = 0;
  let skipped = 0;
  let failed = 0;
  await pool(jobs, CONCURRENCY, async (job) => {
    if (fs.existsSync(job.file) && fs.statSync(job.file).size > 0) {
      skipped += 1;
      return;
    }
    try {
      await download(job.url, job.file);
      saved += 1;
    } catch {
      failed += 1;
    }
  });

  fs.writeFileSync(INDEX, `${JSON.stringify(rows, null, 2)}\n`);
  console.log(`item icons: ${saved} saved, ${skipped} kept, ${failed} failed (${rows.length} items)`);
  if (rows.length === 0 || saved + skipped === 0) process.exitCode = 1;
}

function uniqueFile(name, id, used) {
  const base = String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  const stem = base || `item${id}`;
  let file = `${stem}.png`;
  if (used.has(file)) file = `${stem}_${id}.png`;
  used.add(file);
  return file;
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

async function pool(items, limit, work) {
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (index < items.length) {
        const current = index;
        index += 1;
        await work(items[current]);
      }
    }),
  );
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
