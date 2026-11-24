const fs = require("fs");
const path = require("path");

const OUT = path.join(process.cwd(), "assets/augments");
const INDEX = path.join(OUT, "index.json");
const INDEX_URL =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/cherry-augments.json";
const ASSET_BASE = "https://raw.communitydragon.org/latest/game/assets";
const CONCURRENCY = 8;

void main();

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const payload = await getJson(INDEX_URL);
  const rows = Array.isArray(payload) ? payload : [];
  const used = new Set();
  const index = [];
  const jobs = [];

  for (const row of rows) {
    const id = Number(row.id);
    const iconPath = row.augmentLargeIconPath;
    if (!Number.isFinite(id) || id <= 0 || !iconPath) continue;
    const file = uniqueFile(row.nameTRA || row.augmentNameId || `augment${id}`, id, used);
    index.push({ id, file });
    jobs.push({ file: path.join(OUT, file), url: cdragonAssetUrl(iconPath) });
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
      await downloadWithFallback(job.url, job.file);
      saved += 1;
    } catch {
      failed += 1;
    }
  });

  fs.writeFileSync(INDEX, `${JSON.stringify(index, null, 2)}\n`);
  console.log(`augment icons: ${saved} saved, ${skipped} kept, ${failed} failed (${index.length} augments)`);
  if (index.length === 0 || saved + skipped === 0) process.exitCode = 1;
}

function uniqueFile(name, id, used) {
  const base = String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  const stem = base || `augment${id}`;
  let file = `${stem}.png`;
  if (used.has(file)) file = `${stem}_${id}.png`;
  used.add(file);
  return file;
}

function cdragonAssetUrl(gameDataPath) {
  const relative = String(gameDataPath)
    .replace(/^\/lol-game-data\/assets\/(?:ASSETS\/)?/i, "")
    .replace(/^\/+/, "")
    .toLowerCase();
  return `${ASSET_BASE}/${relative}`;
}

async function downloadWithFallback(url, file) {
  const swapped = url.includes("/cherry/")
    ? url.replace("/cherry/", "/kiwi/")
    : url.includes("/kiwi/")
      ? url.replace("/kiwi/", "/cherry/")
      : "";
  const dtodo = `https://cdn.dtodo.cn/hextech/augment-icons/${url.split("/").pop()}`;
  const urls = [url, swapped, dtodo].filter(Boolean);
  let lastError = new Error(url);
  for (const candidate of urls) {
    try {
      await download(candidate, file);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
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
