const fs = require("fs");
const path = require("path");

const OUT = path.join(process.cwd(), "assets/augments/descriptions.json");
const AUGMENTS_URL =
  "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/ko_kr/v1/cherry-augments.json";
const STRINGS_URL =
  "https://raw.communitydragon.org/latest/game/ko_kr/data/menu/en_us/lol.stringtable.json";

const PREFIXES = ["", "cherry_", "kiwi_", "kiwi_aram_", "kiwi_augment_", "augment_", "aram_augment_", "quest_", "upgrade_"];
const SUFFIXES = ["_description", "_tooltip", "_summary", "_desc", "_long_desc", "_quest_desc"];

const FALLBACKS = {
  3263: "추가 방어력, 마법 저항력, 강인함을 얻습니다. 이 추가 효과는 체력이 최대 체력의 40% 아래일 때 증가합니다.",
  3264: "20의 마법 저항력을 얻고, 추가 마법 저항력이 25% 증가합니다.",
  3265: "20의 방어력을 얻고, 추가 방어력이 25% 증가합니다.",
  355: "능력치 모루를 획득합니다.",
};

void main();

async function main() {
  const [augments, table] = await Promise.all([getJson(AUGMENTS_URL), getJson(STRINGS_URL)]);
  const entries = table.entries ?? table;
  const strings = new Map(Object.entries(entries).map(([key, value]) => [key.toLowerCase(), String(value ?? "")]));
  const byName = nameStems(strings);
  const descriptions = {};
  const missing = [];

  for (const row of Array.isArray(augments) ? augments : []) {
    const id = Number(row.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    const text = pickText(stemsFor(row, byName), strings) || FALLBACKS[id] || "";
    if (!text) {
      missing.push({ id, name: row.nameTRA || row.augmentNameId });
      continue;
    }
    descriptions[id] = text;
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(descriptions)}\n`);
  const total = Array.isArray(augments) ? augments.length : 0;
  console.log(`augment descriptions: ${Object.keys(descriptions).length}/${total}`);
  if (missing.length) console.log("missing", missing);
  if (Object.keys(descriptions).length === 0) process.exitCode = 1;
}

function stemsFor(row, byName) {
  const stems = new Set();
  for (const iconPath of [row.augmentLargeIconPath, row.augmentSmallIconPath]) {
    const stem = fileStem(iconPath);
    if (stem) stems.add(stem);
  }
  const nameId = String(row.augmentNameId ?? "");
  const stripped = nameId.replace(/^ARAM_/i, "");
  if (stripped) {
    stems.add(stripped.toLowerCase());
    stems.add(stripped.replace(/_/g, "").toLowerCase());
  }
  if (/pentakill/i.test(nameId)) {
    stems.add("goh_pentakill");
    stems.add("goh_pentakillaug_generic");
  }
  if (/porocharge/i.test(nameId) || [...stems].some((stem) => stem.includes("porocharge"))) {
    stems.add("porocharge");
    stems.add("kiwi_augment_porocharge");
  }
  for (const extra of byName.get(String(row.nameTRA ?? "").trim()) ?? []) stems.add(extra);
  return [...stems].filter(Boolean);
}

function nameStems(strings) {
  const map = new Map();
  for (const [key, value] of strings) {
    const match = /^(?:cherry|kiwi_aram|kiwi_augment|kiwi|augment|quest|upgrade)_(.+)_(?:name)$/.exec(key);
    if (!match) continue;
    const name = value.trim();
    if (!name) continue;
    const list = map.get(name) ?? [];
    list.push(match[1]);
    map.set(name, list);
  }
  return map;
}

function pickText(stems, strings) {
  for (const suffix of SUFFIXES) {
    for (const stem of stems) {
      for (const prefix of PREFIXES) {
        const hit = strings.get(`${prefix}${stem}${suffix}`);
        if (!hit) continue;
        const text = cleanDescription(resolveTemplates(hit, strings));
        if (usable(text)) return text;
      }
    }
  }
  return "";
}

function resolveTemplates(text, strings, depth = 0) {
  if (depth > 6) return text;
  return String(text).replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, raw) => {
    const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
    if (key === "spellname") return "";
    const hit = strings.get(key);
    return hit ? resolveTemplates(hit, strings, depth + 1) : "";
  });
}

function usable(text) {
  if (!text || text.length < 8) return false;
  if (/^\{\{/.test(text)) return false;
  return true;
}

function fileStem(iconPath) {
  const file = String(iconPath ?? "")
    .split("/")
    .pop()
    ?.replace(/\.(png|tex)$/i, "")
    .replace(/_(large|small)$/i, "");
  return file ? file.toLowerCase() : "";
}

function cleanDescription(text) {
  return String(text)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/%i:[a-z0-9]+%/gi, "")
    .replace(/@[A-Za-z0-9_.]+(?:\*[0-9.]+)?@%?/g, "")
    .replace(/\s의\s/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ +/g, " ")
    .trim();
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}
