const root = document.querySelector("#root");

function paint(view) {
  if (!view.visible) {
    root.hidden = true;
    root.innerHTML = "";
    return;
  }

  const champion = view.champion
    ? `<div class="champion"><span class="name">${escapeHtml(view.champion.name)}</span>${gradeMark(view.champion.grade, "lg")}</div>`
    : "";
  const cards = (view.cards ?? [])
    .slice(0, 3)
    .map((card) => `<div class="card">${gradeLetter(card.augment?.grade, "lg")}</div>`)
    .join("");

  root.hidden = false;
  root.innerHTML = `${champion}<div class="cards">${cards}</div>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

window.penguOverlay.onView(paint);
