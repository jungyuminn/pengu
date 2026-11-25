const root = document.querySelector("#root");

function paint(view) {
  if (!view.visible) {
    root.hidden = true;
    root.innerHTML = "";
    return;
  }

  const build = (view.build ?? [])
    .map(
      (item) =>
        `<div class="build-item" title="${escapeHtml(item.name)}">${
          item.iconUrl
            ? `<img src="${escapeHtml(item.iconUrl)}" alt="${escapeHtml(item.name)}" />`
            : `<span>${escapeHtml((item.name || "?").slice(0, 1))}</span>`
        }</div>`,
    )
    .join("");
  const buildRow = build ? `<div class="build">${build}</div>` : "";

  if (view.notice && !(view.cards ?? []).length) {
    root.hidden = false;
    root.dataset.mode = "notice";
    root.innerHTML = `${buildRow}<p class="notice">${escapeHtml(view.notice)}</p>`;
    return;
  }

  const cards = (view.cards ?? [])
    .map((card) => `<div class="card">${gradeLetter(card.augment?.grade, "lg")}</div>`)
    .join("");

  root.hidden = false;
  root.dataset.mode = (view.cards ?? []).length ? "cards" : "hud";
  root.innerHTML = `<div class="cards">${cards}</div>${buildRow}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

window.penguOverlay.onView(paint);
