const fs = require("fs");
const path = require("path");

const OUT = path.join(process.cwd(), "assets/champions");
const CONCURRENCY = 8;

void main();

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const champions = await championIndex();
  let skipped = 0;
  let saved = 0;
  let failed = 0;

  await pool(champions, CONCURRENCY, async (champion) => {
    const file = path.join(OUT, `${champion.key}.png`);
    if (fs.existsSync(file) && fs.statSync(file).size > 0) {
      skipped += 1;
      return;
    }
    try {
      await download(champion.id, file);
      saved += 1;
    } catch {
      failed += 1;
    }
  });

  console.log(`champion icons: ${saved} saved, ${skipped} kept, ${failed} failed (${champions.length} champions)`);
  if (saved + skipped === 0) process.exitCode = 1;
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

async function download(id, file) {
  const url = `https://cdn.communitydragon.org/latest/champion/${id}/square`;
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
