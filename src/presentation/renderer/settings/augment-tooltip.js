const tip = document.createElement("div");
tip.className = "aug-tip";
tip.hidden = true;
document.body.append(tip);

document.addEventListener("pointerover", (event) => {
  const host = event.target.closest("[data-tip]");
  if (!host) return;
  const text = host.getAttribute("data-tip");
  if (!text) return;
  tip.textContent = text;
  tip.hidden = false;
  placeTip(event);
});

document.addEventListener("pointermove", (event) => {
  if (tip.hidden) return;
  if (!event.target.closest("[data-tip]")) return;
  placeTip(event);
});

document.addEventListener("pointerout", (event) => {
  const host = event.target.closest("[data-tip]");
  if (!host || host.contains(event.relatedTarget)) return;
  tip.hidden = true;
});

function placeTip(event) {
  const pad = 12;
  const x = event.clientX + 14;
  const y = event.clientY + 18;
  const width = tip.offsetWidth;
  const height = tip.offsetHeight;
  tip.style.left = `${Math.min(x, window.innerWidth - width - pad)}px`;
  tip.style.top = `${Math.min(y, window.innerHeight - height - pad)}px`;
}
