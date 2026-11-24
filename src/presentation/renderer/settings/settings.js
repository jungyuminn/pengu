const overlayEnabled = document.querySelector("#overlayEnabled");
const darkMode = document.querySelector("#darkMode");
const prefsBtn = document.querySelector("#prefsBtn");
const prefsMenu = document.querySelector("#prefsMenu");

const textSwap = new WeakMap();

function paint(state) {
  overlayEnabled.checked = state.settings.overlayEnabled;
  applyTheme(state.settings.theme);
  setText("#league", state.leagueConnected ? "롤 연결" : "롤 대기");
  setMessage(state.message);
}

function applyTheme(theme) {
  const mode = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = mode;
  darkMode.checked = mode === "dark";
}

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (!node) return;
  const next = String(value ?? "");
  const prev = node.dataset.shown ?? node.textContent ?? "";
  if (prev === next) return;
  node.dataset.shown = next;
  const live = selector === "#league" && next === "롤 연결" && prev === "롤 대기";
  node.classList.toggle("is-live", selector === "#league" && next === "롤 연결");
  if (prefersReducedMotion() || !prev || prev === "-") {
    node.textContent = next;
    node.classList.remove("swap-out", "swap-from", "live-pop");
    return;
  }
  swapMeta(node, next, live);
}

function swapMeta(node, next, live) {
  const seq = (textSwap.get(node) ?? 0) + 1;
  textSwap.set(node, seq);
  node.classList.remove("swap-from", "live-pop");
  node.classList.add("swap-out");
  window.setTimeout(() => {
    if (textSwap.get(node) !== seq) return;
    node.textContent = next;
    node.classList.remove("swap-out");
    node.classList.add("swap-from");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (textSwap.get(node) !== seq) return;
        node.classList.remove("swap-from");
        if (!live) return;
        node.classList.remove("live-pop");
        void node.offsetWidth;
        node.classList.add("live-pop");
      });
    });
  }, 160);
}

function isBusyMessage(message) {
  return /받는 중|불러오는 중/.test(String(message ?? ""));
}

function setBusy(message) {
  const busy = isBusyMessage(message);
  const status = document.querySelector("#syncStatus");
  if (!status) return;
  status.classList.toggle("is-busy", busy);
  status.setAttribute("aria-busy", busy ? "true" : "false");
}

function messageKind(message) {
  const text = String(message ?? "");
  if (text.includes("통계")) return "stats";
  if (text.includes("빌드")) return "builds";
  if (text.includes("전적")) return "matches";
  if (text.includes("데이터 갱신")) return "done";
  return text;
}

let shownMessage = "";
let pendingMessage = null;
let messageFade = 0;

function setMessage(message) {
  const next = String(message ?? "");
  const node = document.querySelector("#message");
  if (!node) return;
  if (next === shownMessage && pendingMessage == null) return;
  if (prefersReducedMotion()) {
    shownMessage = next;
    pendingMessage = null;
    node.textContent = next;
    node.classList.remove("out", "from");
    setBusy(next);
    return;
  }
  if (!shownMessage) {
    shownMessage = next;
    node.textContent = next;
    setBusy(next);
    return;
  }
  if (messageKind(next) === messageKind(shownMessage) && !messageFade) {
    shownMessage = next;
    node.textContent = next;
    return;
  }
  pendingMessage = next;
  if (isBusyMessage(next)) setBusy(next);
  if (!messageFade) fadeToPending();
}

function fadeToPending() {
  const node = document.querySelector("#message");
  const next = pendingMessage;
  pendingMessage = null;
  if (!node || next == null || next === shownMessage) return;
  node.classList.remove("from");
  node.classList.add("out");
  messageFade = window.setTimeout(() => {
    shownMessage = next;
    node.textContent = next;
    setBusy(next);
    node.classList.remove("out");
    node.classList.add("from");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        node.classList.remove("from");
        messageFade = 0;
        if (pendingMessage != null && pendingMessage !== shownMessage) {
          if (messageKind(pendingMessage) === messageKind(shownMessage)) {
            shownMessage = pendingMessage;
            node.textContent = pendingMessage;
            pendingMessage = null;
            return;
          }
          fadeToPending();
        }
      });
    });
  }, 220);
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let prefsCloseTimer = 0;

function setPrefsOpen(open) {
  window.clearTimeout(prefsCloseTimer);
  prefsBtn.setAttribute("aria-expanded", String(open));
  if (open) {
    prefsMenu.hidden = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => prefsMenu.classList.add("open"));
    });
    return;
  }
  prefsMenu.classList.remove("open");
  prefsCloseTimer = window.setTimeout(() => {
    if (!prefsMenu.classList.contains("open")) prefsMenu.hidden = true;
  }, 220);
}

window.addEventListener("DOMContentLoaded", async () => {
  paint(await window.pengu.getState());
  window.pengu.onState(paint);
  window.pengu.onMessage?.((message) => setMessage(message));

  overlayEnabled.addEventListener("change", async () => {
    paint(await window.pengu.toggleOverlay(overlayEnabled.checked));
  });
  document.querySelector("#sync")?.addEventListener("click", async () => {
    const button = document.querySelector("#sync");
    if (button) button.disabled = true;
    try {
      paint(await window.pengu.sync());
    } finally {
      if (button) button.disabled = false;
    }
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
