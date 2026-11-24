const PRESSABLE = "button:not(.chrome-btn), .toolbar .check";

let pressed = null;

function hostFrom(node) {
  return node instanceof Element ? node.closest(PRESSABLE) : null;
}

function pressDown(event) {
  if (event.button !== 0) return;
  const host = hostFrom(event.target);
  if (!host) return;
  release();
  pressed = host;
  host.classList.add("is-pressed");
  spawnRipple(host, event);
}

function release() {
  if (!pressed) return;
  pressed.classList.remove("is-pressed");
  pressed = null;
}

function spawnRipple(host, event) {
  const rect = host.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const ripple = document.createElement("span");
  ripple.className = "press-ripple";
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
  host.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove());
}

window.addEventListener("pointerdown", pressDown, true);
window.addEventListener("pointerup", release, true);
window.addEventListener("pointercancel", release, true);
window.addEventListener("blur", release);
