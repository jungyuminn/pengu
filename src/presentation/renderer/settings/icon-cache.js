const warmed = new Map();
const warmRoot = document.createElement("div");
warmRoot.hidden = true;
warmRoot.setAttribute("aria-hidden", "true");
document.body.append(warmRoot);

function preloadIcon(url) {
  if (!url || warmed.has(url)) return warmed.get(url);
  const image = new Image();
  image.src = url;
  warmed.set(url, image);
  warmRoot.append(image);
  return image;
}

function preloadIcons(urls) {
  for (const url of urls) preloadIcon(url);
}

document.addEventListener(
  "load",
  (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    if (warmRoot.contains(image)) return;
    if (!image.classList.contains("icon-wait")) return;
    image.classList.remove("icon-wait");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    image.classList.remove("icon-pop");
    void image.offsetWidth;
    image.classList.add("icon-pop");
  },
  true,
);

document.addEventListener(
  "error",
  (event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const next = fallbackAugmentIcon(image.src, image.dataset.iconTried);
    if (!next) return;
    image.dataset.iconTried = next.tried;
    image.src = next.url;
  },
  true,
);

function fallbackAugmentIcon(src, tried) {
  if (!src) return null;
  if (!tried && src.includes("cdn.dtodo.cn/hextech/augment-icons/")) {
    return {
      tried: "cherry",
      url: src.replace(
        /https:\/\/cdn\.dtodo\.cn\/hextech\/augment-icons\//i,
        "https://raw.communitydragon.org/latest/game/assets/ux/cherry/augments/icons/",
      ),
    };
  }
  if (tried !== "kiwi" && src.includes("/cherry/augments/icons/")) {
    return { tried: "kiwi", url: src.replace("/cherry/", "/kiwi/") };
  }
  return null;
}

function collectIconUrls(detail) {
  return [
    detail?.iconUrl,
    ...(detail?.augments ?? []).map((row) => row.iconUrl),
    ...(detail?.startingItems ?? []).map((row) => row.iconUrl),
    ...(detail?.coreItems ?? []).map((row) => row.iconUrl),
    ...(detail?.summoners ?? []).map((row) => row.iconUrl),
    ...(detail?.skills ?? []).map((row) => row.iconUrl),
    ...(detail?.trios ?? []).flatMap((trio) => (trio.icons ?? []).map((row) => row.iconUrl)),
  ].filter(Boolean);
}
