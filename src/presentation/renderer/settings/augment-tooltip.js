const tip = document.createElement("div");
tip.className = "aug-tip";
document.body.append(tip);

let hideTimer = 0;
let activeHost = null;

document.addEventListener("pointerover", (event) => {
  const host = event.target.closest("[data-tip]");
  if (!host) return;
  const text = host.getAttribute("data-tip");
  if (!text) return;
  window.clearTimeout(hideTimer);
  activeHost = host;
  tip.textContent = text;
  placeTip(event);
  if (tip.classList.contains("open")) return;
  if (prefersReducedMotion()) {
    tip.classList.add("open");
    return;
  }
  void tip.offsetWidth;
  tip.classList.add("open");
});

document.addEventListener("pointermove", (event) => {
  if (!tip.classList.contains("open") && !activeHost) return;
  if (!event.target.closest("[data-tip]")) return;
  placeTip(event);
});

document.addEventListener("pointerout", (event) => {
  const host = event.target.closest("[data-tip]");
  if (!host || host.contains(event.relatedTarget)) return;
  hideTip();
});

function hideTip() {
  activeHost = null;
  if (prefersReducedMotion()) {
    tip.classList.remove("open");
    return;
  }
  tip.classList.remove("open");
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    if (!activeHost) tip.style.left = "";
  }, 180);
}

function placeTip(event) {
  const pad = 12;
  const x = event.clientX + 14;
  const y = event.clientY + 18;
  const width = tip.offsetWidth;
  const height = tip.offsetHeight;
  tip.style.left = `${Math.min(x, window.innerWidth - width - pad)}px`;
  tip.style.top = `${Math.min(y, window.innerHeight - height - pad)}px`;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
