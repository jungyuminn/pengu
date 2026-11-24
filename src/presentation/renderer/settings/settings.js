const overlayEnabled = document.querySelector("#overlayEnabled");
const darkMode = document.querySelector("#darkMode");
const prefsBtn = document.querySelector("#prefsBtn");
const prefsMenu = document.querySelector("#prefsMenu");

function paint(state) {
  overlayEnabled.checked = state.settings.overlayEnabled;
  applyTheme(state.settings.theme);
  setText("#patch", state.snapshot?.patch ?? "-");
  setText("#league", state.leagueConnected ? "롤 연결" : "롤 대기");
  setText("#keyState", keyLabel(state));
  setText("#message", state.message);
}

function applyTheme(theme) {
  const mode = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = mode;
  darkMode.checked = mode === "dark";
}

function keyLabel(state) {
  if (state.usingBuiltinKey) return "내장 키";
  if (state.settings.apiKey) return "개인 키";
  return "키 없음";
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) node.textContent = value;
}

function setPrefsOpen(open) {
  prefsMenu.classList.toggle("open", open);
  prefsMenu.hidden = !open;
  prefsBtn.setAttribute("aria-expanded", String(open));
}

window.addEventListener("DOMContentLoaded", async () => {
  paint(await window.pengu.getState());
  window.pengu.onState(paint);

  document.querySelector("#sync")?.addEventListener("click", async () => {
    paint(await window.pengu.sync());
  });
  overlayEnabled.addEventListener("change", async () => {
    paint(await window.pengu.toggleOverlay(overlayEnabled.checked));
  });
  document.querySelector("#preview")?.addEventListener("click", async () => {
    paint(await window.pengu.preview());
  });
  document.querySelector("#minimize")?.addEventListener("click", () => {
    window.pengu.minimize();
  });
  document.querySelector("#closeWindow")?.addEventListener("click", () => {
    window.pengu.closeWindow();
  });
  prefsBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    setPrefsOpen(!prefsMenu.classList.contains("open"));
  });
  darkMode.addEventListener("change", async () => {
    const theme = darkMode.checked ? "dark" : "light";
    applyTheme(theme);
    paint(await window.pengu.setTheme(theme));
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest("#prefsBtn") || event.target.closest("#prefsMenu")) return;
    setPrefsOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setPrefsOpen(false);
  });
});
