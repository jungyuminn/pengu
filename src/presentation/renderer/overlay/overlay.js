const root = document.querySelector("#root");
const drawnChecks = new Set();

function paint(view) {
  if (!view.visible) {
    root.hidden = true;
    root.innerHTML = "";
    return;
  }

  const items = view.build ?? [];
  const liveKeys = new Set(items.map(itemKey));
  for (const key of [...drawnChecks]) {
    if (!liveKeys.has(key)) drawnChecks.delete(key);
  }
  const build = items
    .map((item) => {
      const key = itemKey(item);
      const fresh = Boolean(item.owned) && !drawnChecks.has(key);
      if (item.owned) drawnChecks.add(key);
      return `<div class="build-item${item.owned ? " owned" : ""}" title="${escapeHtml(item.name)}">${
        item.iconUrl
          ? `<img src="${escapeHtml(item.iconUrl)}" alt="${escapeHtml(item.name)}" />`
          : `<span class="letter">${escapeHtml((item.name || "?").slice(0, 1))}</span>`
      }${
        item.owned
          ? `<span class="check${fresh ? " draw" : ""}" aria-label="보유">${checkMark()}</span>`
          : ""
      }</div>`;
    })
    .join("");
  const buildRow = build ? `<div class="build">${build}</div>` : "";

  const cardRows = view.cards ?? [];
  const armCards = Boolean(view.armCards) || cardRows.length > 0;

  if (view.notice && !armCards) {
    root.hidden = false;
    root.dataset.mode = "notice";
    root.innerHTML = `${buildRow}<p class="notice">${escapeHtml(view.notice)}</p>`;
    return;
  }

  if (view.champion && !armCards && !build) {
    root.hidden = false;
    root.dataset.mode = "pick";
    root.innerHTML = `<div class="champion">${gradeLetter(view.champion.grade, "lg")}</div>`;
    return;
  }

  const slotCount = Math.max(3, cardRows.length);
  root.style.setProperty("--offer-slots", String(slotCount));
  const cards = offerSlots(cardRows, slotCount);

  root.hidden = false;
  root.dataset.mode = armCards ? "cards" : "hud";
  root.innerHTML = `<div class="cards">${cards}</div>${armCards ? "" : buildRow}`;
}

function offerSlots(cardRows, slotCount) {
  const bySlot = new Map(cardRows.map((card) => [card.slot, card]));
  return Array.from({ length: slotCount }, (_, index) => {
    const card = bySlot.get(index);
    return card?.augment || card?.query ? cardChip(card) : `<div class="card"></div>`;
  }).join("");
}

function cardChip(card) {
  const name = card.augment?.names?.ko || card.query || "";
  const advice = card.advice || "";
  const place =
    card.catalogRank && card.catalogTotal ? `${card.catalogRank}/${card.catalogTotal}` : "";
  return `<div class="card">
    <div class="card-chip">
      ${gradeLetter(card.augment?.grade)}
      <span class="copy">
        <span class="name">${escapeHtml(name)}</span>
        ${advice ? `<span class="advice">${escapeHtml(advice)}</span>` : ""}
      </span>
      ${place ? `<span class="place">${place}</span>` : ""}
    </div>
  </div>`;
}

function itemKey(item) {
  return String(item.id ?? item.name ?? "");
}

function checkMark() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5.5 13.2L10.8 18.8 20.2 4.8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" pathLength="1" />
  </svg>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

window.penguOverlay.onView(paint);
