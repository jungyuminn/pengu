const RARITY_LABEL = { silver: "실버", gold: "골드", prismatic: "프리즘" };

let paintedMeKey = "";
let selectedMatchId = null;

function paintHome(state) {
  const pane = document.querySelector("#championDetail");
  const home = state?.home ?? {};
  preloadIcons(metaIcons(home));
  pane.innerHTML = `<div class="home" data-home-root>
    ${metaChampionsHtml(home.metaChampions)}
    ${metaAugmentsHtml(home.metaAugments)}
  </div>`;
  restartAnim(pane.querySelector("[data-home-root]"), "detail-enter");
}

function paintMeIfChanged(state) {
  const key = meKey(state);
  const pane = document.querySelector("#mePane");
  if (key && key === paintedMeKey && pane.querySelector("[data-me-root]")) return;
  paintedMeKey = key;
  paintMe(state);
}

function meKey(state) {
  const home = state?.home ?? {};
  const last = home.matches?.[0];
  return [
    home.account?.puuid,
    home.account?.iconUrl,
    home.games,
    home.wins,
    last?.gameId,
    last?.players?.length ?? 0,
    state?.leagueConnected ? 1 : 0,
  ].join("|");
}

function paintMe(state) {
  const pane = document.querySelector("#mePane");
  if (!pane) return;
  const home = state?.home ?? {};
  const connected = Boolean(state?.leagueConnected);
  preloadIcons(matchIcons(home));
  pane.innerHTML = `<div class="me" data-me-root>${myMayhemHtml(home, connected)}</div>`;
  highlightMatch();
}

function highlightMatch(scrollTo = false) {
  const pane = document.querySelector("#mePane");
  if (!pane) return;
  let active = null;
  for (const row of pane.querySelectorAll(".match-row")) {
    const on = Number(row.dataset.gameId) === selectedMatchId;
    row.classList.toggle("active", on);
    if (on) active = row;
  }
  if (scrollTo && active) {
    active.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }
}

function metaChampionsHtml(rows) {
  if (!rows?.length) return `<p class="empty">메타 챔피언을 불러오는 중...</p>`;
  return `<section class="section">
    <h2>메타 챔피언</h2>
    <div class="home-grid">${rows.map(homeChampionCard).join("")}</div>
  </section>`;
}

function homeChampionCard(item) {
  return `<button type="button" class="home-champ" data-id="${item.id}">
    ${icon(item.iconUrl, item.name)}
    <span class="name">${escapeHtml(item.name)}</span>
    ${gradeLetter(item.grade)}
  </button>`;
}

function metaAugmentsHtml(rows) {
  if (!rows?.length) return "";
  const groups = ["silver", "gold", "prismatic"].map((rarity) => {
    const list = rows.filter((row) => row.rarity === rarity);
    if (!list.length) return "";
    return `<div class="home-aug">
      <h2>${RARITY_LABEL[rarity] ?? rarity}</h2>
      ${list.map(homeAugmentRow).join("")}
    </div>`;
  });
  return `<section class="section"><div class="rarity-grid">${groups.join("")}</div></section>`;
}

function homeAugmentRow(row) {
  return `<div class="home-aug-row">
    ${icon(row.iconUrl, row.name)}
    <span class="name">${escapeHtml(row.name)}</span>
    <span class="rates">픽 ${pct(row.pickRate)}</span>
    ${gradeLetter(row.grade)}
  </div>`;
}

function myMayhemHtml(home, connected) {
  const title = home.account ? riotId(home.account) : "내 증바람";
  const note =
    connected || home.games ? "" : `<p class="note">롤에 로그인하면 최근 증바람을 가져옵니다.</p>`;
  const empty = home.games
    ? ""
    : `<p class="empty">${connected ? "최근 증바람 전적이 없습니다." : "롤이 꺼져 있으면 전적을 새로 가져올 수 없습니다."}</p>`;
  return `
    <header class="me-head">
      <div class="me-id">
        ${profileMark(home.account?.iconUrl, title)}
        <div class="me-copy">
          <h2>${escapeHtml(title)}</h2>
          ${meStatsHtml(home)}
        </div>
      </div>
      ${streakHtml(home.matches)}
      ${note}
    </header>
    ${empty}
    ${home.matches?.length ? `<div class="match-list">${home.matches.map(matchRow).join("")}</div>` : ""}
  `;
}

function meStatsHtml(home) {
  if (!home.games) return "";
  const rate = home.winRate == null ? "—" : `${Number(home.winRate).toFixed(0)}%`;
  const wins = Number(home.wins) || 0;
  const losses = Math.max(0, Number(home.games) - wins);
  return `<p class="me-meta">${home.games}전 ${wins}승 ${losses}패 · 승률 ${rate} · KDA ${kdaRatioHtml(home.kda)}</p>`;
}

function kdaToneClass(value) {
  if (value === "Perfect") return "high";
  const ratio = Number.parseFloat(value);
  if (!Number.isFinite(ratio)) return "low";
  if (ratio >= 4) return "high";
  if (ratio >= 2) return "ok";
  return "low";
}

function kdaRatioHtml(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "—") return "—";
  return `<span class="kda-ratio ${kdaToneClass(text)}">${escapeHtml(text)}</span>`;
}

function streakHtml(matches) {
  if (!matches?.length) return "";
  return `<div class="streak" aria-label="최근 20전">${matches.slice(0, 20).map(streakMark).join("")}</div>`;
}

function streakMark(row, index) {
  const win = Boolean(row.win);
  return `<button type="button" class="streak-mark ${win ? "win" : "loss"}" style="--i:${index}" data-game-id="${row.gameId}" title="${win ? "승리" : "패배"}"><span>${win ? "승" : "패"}</span></button>`;
}

function matchRow(row, index) {
  const name = escapeHtml(row.championName || `#${row.championId}`);
  const augs = (row.augments ?? [])
    .map((item) => icon(item.iconUrl, item.name))
    .filter(Boolean)
    .join("");
  const win = Boolean(row.win);
  const active = Number(row.gameId) === selectedMatchId ? " active" : "";
  return `<button type="button" class="match-row ${win ? "win" : "loss"}${row.mvp ? " mvp" : ""}${active}${augs ? " has-augs" : ""}" style="--i:${index}" data-game-id="${row.gameId}">
    <span class="row-hit">
      <span class="match-bar" aria-hidden="true"></span>
      ${icon(row.championIconUrl, row.championName) || `<span class="champ-slot" aria-hidden="true"></span>`}
      <span class="who">
        <span class="name"><span class="name-text">${name}</span>${row.mvp ? `<em class="mvp-tag">MVP</em>` : ""}</span>
        <span class="kda">${row.kills}/${row.deaths}/${row.assists}${kdaRatioHtml(row.kda)}</span>
      </span>
      <span class="result">${win ? "승리" : "패배"}</span>
      ${augs ? `<span class="match-augs">${augs}</span>` : ""}
    </span>
  </button>`;
}

function matchAugment(item) {
  const img = icon(item.iconUrl, item.name);
  if (!img) return "";
  const text = [item.name, item.description].filter(Boolean).join("\n");
  return `<span class="match-aug"${tipAttr(text)}>${img}</span>`;
}

function profileMark(url, name) {
  if (!url) return "";
  preloadIcon(url);
  return `<img class="me-icon" src="${escapeHtml(url)}" alt="${escapeHtml(name)}" decoding="sync" onerror="this.remove()" />`;
}

function riotId(account) {
  if (!account?.gameName) return "내 증바람";
  return account.tagLine ? `${account.gameName}#${account.tagLine}` : account.gameName;
}

function metaIcons(home) {
  return [
    ...(home.metaChampions ?? []).map((item) => item.iconUrl),
    ...(home.metaAugments ?? []).map((item) => item.iconUrl),
  ];
}

function matchIcons(home) {
  return [
    home.account?.iconUrl,
    ...(home.matches ?? []).flatMap((row) => [
      row.championIconUrl,
      ...(row.augments ?? []).map((item) => item.iconUrl),
    ]),
  ];
}
