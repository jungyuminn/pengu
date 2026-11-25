let paintedMatchKey = "";
let paintedMatchId = null;
let matchFitSeq = 0;

function paintMatchIfChanged(state, gameId) {
  const match = findHomeMatch(state, gameId);
  const key = [gameId, match?.players?.length ?? 0, match?.durationSec ?? 0, match?.kda ?? ""].join("|");
  const pane = document.querySelector("#championDetail");
  if (key === paintedMatchKey && pane.querySelector("[data-match-root]")) return;
  const switched = paintedMatchId != null && paintedMatchId !== gameId;
  paintedMatchKey = key;
  paintedMatchId = gameId;
  paintMatchView(match, switched);
}

function resetMatchPaint() {
  paintedMatchKey = "";
  paintedMatchId = null;
  matchFitSeq += 1;
}

function paintMatchView(match, switched) {
  const pane = document.querySelector("#championDetail");
  if (!match) {
    pane.innerHTML = `<p class="empty">이 판을 찾을 수 없습니다.</p>`;
    return;
  }
  preloadIcons(matchDetailIcons(match));
  const first = !pane.querySelector("[data-match-root]");
  pane.innerHTML = matchDetailHtml(match, {});
  const root = pane.querySelector("[data-match-root]");
  if (first || switched) restartAnim(root, "detail-enter");
  if (switched || first) pane.scrollTop = 0;
  void fillMatchFits(match, match.gameId);
}

function findHomeMatch(state, gameId) {
  return (state?.home?.matches ?? []).find((row) => row.gameId === gameId) ?? null;
}

async function fillMatchFits(match, gameId) {
  const seq = ++matchFitSeq;
  const players = match.players ?? [];
  if (!players.length || !window.pengu?.matchFits) return;
  try {
    const fits = await window.pengu.matchFits(
      players.map((row, index) => ({
        key: String(index),
        championId: row.championId,
        itemIds: (row.items ?? []).map((item) => item.id),
        augmentIds: (row.augments ?? []).map((item) => item.id),
      })),
    );
    if (seq !== matchFitSeq || selectedMatchId !== gameId) return;
    const pane = document.querySelector("#championDetail");
    const body = pane.querySelector("[data-match-body]");
    if (!body) return;
    const teams = teamsOf(match.players ?? []);
    if (!teams) return;
    body.innerHTML = `<div data-scoreboard>${scoreboardHtml(teams, fits ?? {})}</div>`;
    restartAnim(body, "body-in");
  } catch {
    return;
  }
}

function matchDetailHtml(match, fits = {}) {
  const teams = teamsOf(match.players ?? []);
  const result = match.win ? "W" : "L";
  return `<div class="match-detail" data-match-root>
    <header class="match-hero">
      <span class="match-hero-result ${match.win ? "win" : "loss"}">${result}</span>
      <div>
        <h1>${escapeHtml(match.championName)}</h1>
        <p class="match-hero-meta">${escapeHtml(matchClock(match.durationSec))} · ${escapeHtml(matchWhen(match.playedAt))} · ${match.kills}/${match.deaths}/${match.assists} ${kdaRatioHtml(match.kda)}</p>
      </div>
    </header>
    <div data-match-body>
      ${teams ? `<div data-scoreboard>${scoreboardHtml(teams, fits)}</div>` : `<p class="note">이 판은 목록만 있습니다. 롤을 켠 채로 새로고침하면 스코어보드를 채웁니다.</p>`}
    </div>
  </div>`;
}

function teamsOf(players) {
  const rows = players.map((row, index) => ({ ...row, fitKey: String(index) }));
  if (rows.length < 2) return null;
  if (rows.every((row) => !row.teamId)) {
    const half = Math.ceil(rows.length / 2);
    const selfIndex = rows.findIndex((row) => row.self);
    const first = rows.slice(0, half);
    const second = rows.slice(half);
    return selfIndex >= half ? { ally: second, enemy: first } : { ally: first, enemy: second };
  }
  const selfTeam = rows.find((row) => row.self)?.teamId || rows[0]?.teamId;
  return {
    ally: rows.filter((row) => row.teamId === selfTeam),
    enemy: rows.filter((row) => row.teamId !== selfTeam),
  };
}

function scoreboardHtml(teams, fits) {
  const peak = Math.max(1, ...[...teams.ally, ...teams.enemy].map((row) => row.damage || 0));
  return `${teamHtml(teams.ally, peak, fits)}${teamHtml(teams.enemy, peak, fits)}`;
}

function teamHtml(rows, peak, fits) {
  if (!rows.length) return "";
  const won = teamWon(rows);
  const title = won === true ? "승리" : won === false ? "패배" : "";
  const tone = won === true ? "win" : won === false ? "loss" : "";
  const heading = title ? `<h2 class="${tone}">${title}</h2>` : "";
  return `<section class="section score-team">
    ${heading}
    <div class="score-list">${rows.map((row) => scoreRow(row, peak, fits)).join("")}</div>
  </section>`;
}

function teamWon(rows) {
  if (rows.some((row) => row.win)) return true;
  if (rows.some((row) => row.win === false)) return false;
  return null;
}

function scoreRow(row, peak, fits) {
  const name = escapeHtml(row.name || row.championName);
  const width = Math.round(((row.damage || 0) / peak) * 100);
  const fit = fits[row.fitKey];
  const hitItems = new Set(fit?.matchedItemIds ?? []);
  return `<button type="button" class="score-row${row.self ? " self" : ""}${row.mvp ? " mvp" : ""}${row.win ? " win" : " loss"}" data-id="${row.championId}">
    <span class="row-hit">
      ${icon(row.championIconUrl, row.championName)}
      <span class="who">
        <span class="name"><span class="name-text">${name}</span>${row.mvp ? `<em class="mvp-tag">MVP</em>` : ""}</span>
        <span class="kda">${row.kills}/${row.deaths}/${row.assists}${kdaRatioHtml(row.kda)}</span>
      </span>
      <span class="score-gear">
        <span class="score-spells">${(row.spells ?? []).map((item) => icon(item.iconUrl, "")).join("")}</span>
        <span class="score-items">${(row.items ?? []).map((item) => itemSlot(item, fit, hitItems)).join("")}</span>
        <span class="score-augs">${(row.augments ?? []).map((item) => scoreAugment(item, fit)).join("")}</span>
      </span>
      ${fitMark(fit)}
      <span class="score-dmg"><i style="width:${width}%"></i><b>${compactNum(row.damage)}</b></span>
    </span>
  </button>`;
}

function fitMark(fit) {
  if (fit?.percent == null) return `<span class="score-fit muted">—</span>`;
  const tone = fit.percent >= 67 ? "high" : fit.percent >= 40 ? "mid" : "low";
  const tip = `증강 ${fit.augmentHits}/${fit.augmentTotal} · 코어 ${fit.itemHits}/${fit.itemTotal}`;
  return `<span class="score-fit ${tone}" title="${escapeHtml(tip)}">${fit.percent}%</span>`;
}

function scoreAugment(item, fit) {
  const html = matchAugment(item);
  if (!html) return "";
  if (!fit) return html;
  const grade = fit.gradesById?.[item.id];
  const kind = grade === "S" ? "hit" : grade === "A" ? "grade-a" : grade === "B" ? "grade-b" : "miss";
  return html.replace('class="match-aug"', `class="match-aug ${kind}"`);
}

function itemSlot(item, fit, hits) {
  if (!item?.id) return `<span class="item-slot"></span>`;
  const skip = new Set(fit?.ignoreItemIds ?? []);
  const kind = !fit ? "" : hits.has(item.id) ? " hit" : skip.has(item.id) ? "" : " miss";
  const text = [item.name, item.description].filter(Boolean).join("\n");
  return `<span class="item-slot${kind}"${tipAttr(text)}>${icon(item.iconUrl, item.name || "")}</span>`;
}

function matchClock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function matchWhen(playedAt) {
  const time = Number(playedAt) || 0;
  if (!time) return "";
  const date = new Date(time);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

function compactNum(value) {
  const amount = Number(value) || 0;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
  return String(amount);
}

function matchDetailIcons(match) {
  return (match.players ?? []).flatMap((row) => [
    row.championIconUrl,
    ...(row.spells ?? []).map((item) => item.iconUrl),
    ...(row.items ?? []).map((item) => item.iconUrl),
    ...(row.augments ?? []).map((item) => item.iconUrl),
  ]);
}
