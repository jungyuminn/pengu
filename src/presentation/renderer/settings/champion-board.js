const tierList = document.querySelector("#tierList");
const detailPane = document.querySelector("#championDetail");
const search = document.querySelector("#championSearch");

const RARITY_COLUMNS = [
  ["silver", "실버"],
  ["gold", "골드"],
  ["prismatic", "프리즘"],
];

let selectedId = null;
let paintedDetailId = null;
let latestTiers = [];
let latestState = { home: {}, leagueConnected: false };
let paintedAt = "";
let paintedHomeKey = "";
let requestSeq = 0;
let followedChampionId = null;

function paintBoard(state) {
  latestState = state;
  latestTiers = state.tiers ?? [];
  preloadIcons(latestTiers.flatMap((group) => group.champions.map((item) => item.iconUrl)));
  const stamp = state.snapshot?.syncedAt ?? "";
  if (!(stamp && stamp === paintedAt)) {
    paintedAt = stamp;
    renderList();
  }
  paintMeIfChanged(state);
  if (selectedMatchId != null) paintMatchIfChanged(state, selectedMatchId);
  else if (selectedId == null) paintHomeIfChanged(state);
}

function renderList(fromSearch) {
  const query = normalize(search.value);
  const existing = tierList.querySelectorAll(".champ-row");
  if (fromSearch && existing.length) {
    filterRows(query);
    return;
  }
  const rows = latestTiers
    .flatMap((group) => group.champions)
    .map((item, index) => ({ item, rank: index + 1 }));
  tierList.innerHTML = rows.map(({ item, rank }) => championRow(item, rank)).join("");
  filterRows(query);
}

function filterRows(query) {
  const revealed = [];
  for (const row of tierList.querySelectorAll(".champ-row")) {
    const show = rowMatches(row, query);
    const wasHidden = row.hidden;
    row.hidden = !show;
    row.classList.remove("row-in");
    if (show && wasHidden) revealed.push(row);
  }
  if (!query || revealed.length > 12) return;
  for (const row of revealed) row.classList.add("row-in");
}

function rowMatches(row, query) {
  if (!query) return true;
  const item = findChampion(Number(row.dataset.id));
  if (item) return championMatches(item, query);
  return normalize(row.dataset.search || "").includes(query);
}

function championMatches(item, query) {
  const haystack = normalize(
    item.searchText || [item.names?.ko, item.names?.en, item.key, choseong(item.names?.ko || "")].filter(Boolean).join("|"),
  );
  return haystack.includes(query);
}

function championRow(item, rank) {
  const active = item.id === selectedId ? " active" : "";
  return `<button type="button" class="champ-row${active}" data-id="${item.id}" data-search="${escapeHtml(item.searchText || "")}">
    <span class="rank">${rank}</span>
    <span class="champ-col">
      ${icon(item.iconUrl, item.names.ko)}
      <span class="name">${escapeHtml(item.names.ko)}</span>
    </span>
    ${gradeLetter(item.grade)}
  </button>`;
}

function showHome() {
  selectedId = null;
  selectedMatchId = null;
  paintedDetailId = null;
  paintedHomeKey = "";
  resetMatchPaint();
  highlight();
  highlightMatch();
  paintMeIfChanged(latestState);
  paintHomeIfChanged(latestState);
}

function paintHomeIfChanged(state) {
  const key = homeKey(state);
  if (key && key === paintedHomeKey && detailPane.querySelector("[data-home-root]")) return;
  paintedHomeKey = key;
  paintHome(state);
}

function homeKey(state) {
  const home = state?.home ?? {};
  return [home.patch, home.metaChampions?.[0]?.id, home.metaAugments?.[0]?.id].join("|");
}

function openMatch(gameId) {
  if (selectedMatchId === gameId && document.querySelector("[data-match-root]")) {
    showHome();
    return;
  }
  selectedId = null;
  selectedMatchId = gameId;
  paintedDetailId = null;
  paintedHomeKey = "";
  highlight();
  highlightMatch(true);
  paintMatchIfChanged(latestState, gameId);
}

function followPlayingChampion(id) {
  const next = Number(id) > 0 ? Number(id) : null;
  if (next === followedChampionId) return;
  followedChampionId = next;
  if (!next || selectedId === next) return;
  void openChampion(next, false);
}

async function openChampion(id, toggleHome = true) {
  if (toggleHome && selectedId === id) {
    showHome();
    return;
  }
  if (!toggleHome && selectedId === id) return;
  const seq = ++requestSeq;
  selectedId = id;
  selectedMatchId = null;
  resetMatchPaint();
  highlight();
  highlightMatch();
  const preview = findChampion(id);
  if (preview) paintDetail(fromList(preview), true);

  try {
    const detail = preferListIcon(await window.pengu.championDetail(id), preview);
    if (seq !== requestSeq) return;
    preloadIcons(collectIconUrls(detail));
    paintDetail(detail, false);
  } catch (error) {
    if (seq !== requestSeq) return;
    const message = error instanceof Error ? error.message : "불러오지 못했습니다.";
    if (preview) {
      paintDetail(fromList(preview), false, message);
    } else {
      detailPane.innerHTML = `<p class="empty">${escapeHtml(message)}</p>`;
    }
  }
}

function paintDetail(detail, loading, error) {
  const first = !detailPane.querySelector("[data-detail-root]");
  const switched = paintedDetailId != null && paintedDetailId !== selectedId;
  ensureDetailShell();
  const root = detailPane.querySelector("[data-detail-root]");
  const image = detailPane.querySelector(".hero-icon");
  setHeroIcon(image, detail.iconUrl, detail.name);
  detailPane.querySelector("h1").textContent = detail.name;
  const tier = detailPane.querySelector("[data-hero-tier]");
  if (tier) tier.innerHTML = gradeLetter(detail.grade);
  const meta = detailPane.querySelector("[data-hero-meta]");
  const body = detailPane.querySelector("[data-detail-body]");
  if (loading) {
    if (first || switched) {
      meta.replaceChildren();
      body.replaceChildren();
    }
  } else {
    meta.innerHTML = heroMetaHtml(detail);
    body.innerHTML = `${bodyHtml(detail)}${
      error ? `<p class="empty">${escapeHtml(error)}</p>` : ""
    }`;
    restartAnim(body, "body-in");
  }
  if (first) restartAnim(root, "detail-enter");
  else if (switched) restartAnim(detailPane.querySelector(".hero"), "hero-switch");
  paintedDetailId = selectedId;
}

function restartAnim(node, className) {
  if (!node) return;
  node.classList.remove("detail-enter", "hero-switch", "body-in", "row-in");
  void node.offsetWidth;
  node.classList.add(className);
}

function ensureDetailShell() {
  if (detailPane.querySelector("[data-detail-root]")) return;
  detailPane.innerHTML = `
    <div data-detail-root>
      <div class="hero">
        <div class="hero-portrait">
          <img class="hero-icon" alt="" decoding="sync" />
          <span data-hero-tier></span>
        </div>
        <div>
          <h1></h1>
          <div class="hero-meta" data-hero-meta></div>
        </div>
      </div>
      <div data-detail-body></div>
    </div>
  `;
}

function setHeroIcon(image, url, name) {
  image.alt = name || "";
  if (!url) {
    image.removeAttribute("src");
    image.hidden = true;
    return;
  }
  image.hidden = false;
  preloadIcon(url);
  if (image.getAttribute("src") !== url) image.src = url;
}

function preferListIcon(detail, preview) {
  if (!preview?.iconUrl) return detail;
  return { ...detail, iconUrl: preview.iconUrl };
}

function highlight() {
  for (const row of tierList.querySelectorAll(".champ-row")) {
    row.classList.toggle("active", Number(row.dataset.id) === selectedId);
  }
}

function findChampion(id) {
  for (const group of latestTiers) {
    const hit = group.champions.find((item) => item.id === id);
    if (hit) return hit;
  }
  return null;
}

function fromList(item) {
  return {
    id: item.id,
    name: item.names.ko,
    title: item.title || "",
    iconUrl: item.iconUrl,
    roles: [],
    grade: item.grade,
    winRate: item.winRate,
    pickRate: item.pickRate,
    patch: "",
    augments: [],
    skillOrder: "",
    startingItems: [],
    coreItems: [],
    summoners: [],
    trios: [],
  };
}

function heroMetaHtml(detail) {
  const spells = (detail.summoners ?? [])
    .map((item) => icon(item.iconUrl, item.name))
    .filter(Boolean)
    .join("");
  const spellRow = spells ? `<span class="hero-spells">${spells}</span>` : "";
  return `${skillOrderHtml(detail)}${spellRow}`;
}

function skillOrderHtml(detail) {
  const keys = String(detail.skillOrder ?? "")
    .split(/\s*>\s*/)
    .map((key) => key.trim())
    .filter(Boolean);
  if (!keys.length) return "";
  const byKey = new Map((detail.skills ?? []).map((skill) => [String(skill.key).toUpperCase(), skill]));
  const arrow = `<span class="skill-arrow" aria-hidden="true"></span>`;
  return `<span class="hero-skill">${keys.map((key) => skillIconHtml(key, byKey.get(key.toUpperCase()))).join(arrow)}</span>`;
}

function skillIconHtml(key, skill) {
  const label = escapeHtml(key.toUpperCase());
  const img = icon(skill?.iconUrl, skill?.name || key);
  return `<span class="skill-icon">${img}<span class="skill-key">${label}</span></span>`;
}

function championRank(id) {
  const index = latestTiers.flatMap((group) => group.champions).findIndex((item) => item.id === id);
  return index >= 0 ? index + 1 : null;
}

function bodyHtml(detail) {
  const rank = championRank(detail.id);
  return `
    <dl class="stats">
      ${stat("순위", rank == null ? "-" : `${rank}위`)}
      ${stat("승률", pct(detail.winRate))}
      ${stat("픽률", pct(detail.pickRate))}
    </dl>
    ${augmentSections(detail)}
    ${iconSection("코어 아이템", detail.coreItems, true)}
    ${
      detail.trios?.length
        ? `<section class="section"><h2>증강 조합</h2>${detail.trios.map(trioRow).join("")}</section>`
        : ""
    }
  `;
}

function iconSection(title, items, sequenced = false) {
  if (!items?.length) return "";
  const arrow = `<span class="item-arrow" aria-hidden="true"><span class="skill-arrow"></span></span>`;
  const body = sequenced ? items.map(iconCard).join(arrow) : items.map(iconCard).join("");
  return `<section class="section"><h2>${title}</h2><div class="icons${sequenced ? " sequenced" : ""}">${body}</div></section>`;
}

function augmentSections(detail) {
  if (!detail.augments?.length) return "";
  return `<section class="section">
    <div class="rarity-grid">
      ${RARITY_COLUMNS.map(([rarity, title]) => {
        const rows = detail.augments.filter((row) => row.rarity === rarity).slice(0, 10);
        return `<div class="rarity-col ${rarity}">
          <h2>${title}</h2>
          <div class="aug-list">${rows.length ? rows.map(augmentRow).join("") : `<p class="empty">-</p>`}</div>
        </div>`;
      }).join("")}
    </div>
  </section>`;
}

function trioRow(trio) {
  const pieces = trio.icons?.length ? trio.icons : (trio.names ?? []).map((name) => ({ name, iconUrl: null }));
  const body = pieces.length
    ? pieces.map((item) => `<span class="trio-aug"${tipAttr(item.description)}>${icon(item.iconUrl, item.name)}<span>${escapeHtml(item.name)}</span></span>`).join("")
    : escapeHtml((trio.names ?? []).join(" · "));
  return `<div class="trio">${body}<span class="rates">${pct(trio.winRate)}</span></div>`;
}

function augmentRow(row) {
  return `<div class="aug-row"${tipAttr(row.description)}>
    ${icon(row.iconUrl, row.name)}
    <span class="name">${escapeHtml(row.name)}</span>
    <span class="rates">픽 ${pct(row.pickRate)} · 승 ${pct(row.winRate)}</span>
    ${gradeLetter(row.grade)}
  </div>`;
}

function iconCard(item) {
  const text = [item.name, item.description].filter(Boolean).join("\n");
  return `<div class="icon-card"${tipAttr(text)}>${icon(item.iconUrl, item.name)}<span>${escapeHtml(item.name)}</span></div>`;
}

function stat(label, value) {
  return `<div class="stat"><dt>${label}</dt><dd>${value}</dd></div>`;
}

function icon(url, name) {
  if (!url) return "";
  preloadIcon(url);
  return `<img src="${escapeHtml(url)}" alt="${escapeHtml(name)}" decoding="sync" />`;
}

function pct(value) {
  return value == null ? "-" : `${Number(value).toFixed(1)}%`;
}


const CHOSEONG = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const LEADING_JAMO = "ᄀᄁᄂᄃᄄᄅᄆᄇᄈᄉᄊᄋᄌᄍᄎᄏᄐᄑᄒ";

function choseong(value) {
  let result = "";
  for (const char of String(value ?? "")) {
    const lead = LEADING_JAMO.indexOf(char);
    if (lead >= 0) {
      result += CHOSEONG[lead];
      continue;
    }
    const code = char.charCodeAt(0) - 0xac00;
    if (code >= 0 && code <= 11171) {
      result += CHOSEONG[Math.floor(code / 588)] ?? "";
      continue;
    }
    const compat = toCompatJamo(char);
    if (CHOSEONG.includes(compat)) result += compat;
  }
  return result;
}

function toCompatJamo(value) {
  let result = "";
  for (const char of value) {
    const lead = LEADING_JAMO.indexOf(char);
    result += lead >= 0 ? CHOSEONG[lead] : char;
  }
  return result;
}

function normalize(value) {
  return toCompatJamo(String(value ?? "").normalize("NFKC").toLowerCase()).replace(
    /[\s"'`~!@#$%^&*()[\]{};:,.<>/?\\|_+=-]+/g,
    "",
  );
}

function tipAttr(text) {
  if (!text) return "";
  return ` data-tip="${escapeHtml(text).replace(/\n/g, "&#10;")}"`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

tierList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  void openChampion(Number(button.dataset.id));
});

detailPane.addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  if (!detailPane.querySelector("[data-home-root], [data-match-root]")) return;
  void openChampion(Number(button.dataset.id));
});

document.querySelector("#mePane")?.addEventListener("click", (event) => {
  const match = event.target.closest("[data-game-id]");
  if (match) {
    openMatch(Number(match.dataset.gameId));
    return;
  }
  const button = event.target.closest("[data-id]");
  if (!button) return;
  void openChampion(Number(button.dataset.id));
});

document.querySelector("#homeBtn")?.addEventListener("click", () => {
  showHome();
});

search.addEventListener("input", () => renderList(true));

window.addEventListener("DOMContentLoaded", async () => {
  paintBoard(await window.pengu.getState());
  window.pengu.onState(paintBoard);
  window.pengu.onPlaying?.(followPlayingChampion);
});
