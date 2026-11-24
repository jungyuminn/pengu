const fs = require("fs");
const path = require("path");

const OUT = path.join(process.cwd(), "assets/skills");
const KEYS = ["q", "w", "e"];
const CONCURRENCY = 8;

void main();

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const champions = await championIndex();
  const jobs = champions.flatMap((champion) =>
    KEYS.map((key) => ({
      id: champion.id,
      file: path.join(OUT, `${champion.key}_${key}.png`),
      legacy: path.join(OUT, `${champion.id}-${key}.png`),
      key,
    })),
  );
  let skipped = 0;
  let renamed = 0;
  let saved = 0;
  let failed = 0;

  await pool(jobs, CONCURRENCY, async (job) => {
    if (fs.existsSync(job.file) && fs.statSync(job.file).size > 0) {
      removeIfExists(job.legacy);
      skipped += 1;
      return;
    }
    if (fs.existsSync(job.legacy) && fs.statSync(job.legacy).size > 0) {
      fs.renameSync(job.legacy, job.file);
      renamed += 1;
      return;
    }
    try {
      await download(job.id, job.key, job.file);
      saved += 1;
    } catch {
      failed += 1;
    }
  });

  console.log(
    `skill icons: ${saved} saved, ${renamed} renamed, ${skipped} kept, ${failed} failed (${champions.length} champions)`,
  );
  if (saved + renamed + skipped === 0) process.exitCode = 1;
}

async function championIndex() {
  const versions = await getJson("https://ddragon.leagueoflegends.com/api/versions.json");
  const version = versions[0];
  if (!version) return [];
  const payload = await getJson(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
  return Object.values(payload.data ?? {}).flatMap((row) => {
    const id = Number(row.key);
    const key = String(row.id ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (!Number.isFinite(id) || id <= 0 || !key) return [];
    return [{ id, key }];
  });
}

async function download(id, key, file) {
  const url = `https://cdn.communitydragon.org/latest/champion/${id}/ability-icon/${key}`;
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

function removeIfExists(file) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
