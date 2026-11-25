const fs = require("fs");
const path = require("path");

const files = [
  ["src/presentation/renderer/settings/index.html", "dist/presentation/renderer/settings/index.html"],
  ["src/presentation/renderer/settings/settings.css", "dist/presentation/renderer/settings/settings.css"],
  ["src/presentation/renderer/settings/settings.js", "dist/presentation/renderer/settings/settings.js"],
  ["src/presentation/renderer/settings/board.css", "dist/presentation/renderer/settings/board.css"],
  ["src/presentation/renderer/settings/home.css", "dist/presentation/renderer/settings/home.css"],
  ["src/presentation/renderer/settings/champion-board.js", "dist/presentation/renderer/settings/champion-board.js"],
  ["src/presentation/renderer/settings/home.js", "dist/presentation/renderer/settings/home.js"],
  ["src/presentation/renderer/settings/match-detail.css", "dist/presentation/renderer/settings/match-detail.css"],
  ["src/presentation/renderer/settings/match-detail.js", "dist/presentation/renderer/settings/match-detail.js"],
  ["src/presentation/renderer/settings/augment-tooltip.js", "dist/presentation/renderer/settings/augment-tooltip.js"],
  ["src/presentation/renderer/settings/icon-cache.js", "dist/presentation/renderer/settings/icon-cache.js"],
  ["src/presentation/renderer/splash/index.html", "dist/presentation/renderer/splash/index.html"],
  ["src/presentation/renderer/splash/splash.css", "dist/presentation/renderer/splash/splash.css"],
  ["src/presentation/renderer/overlay/index.html", "dist/presentation/renderer/overlay/index.html"],
  ["src/presentation/renderer/overlay/overlay.css", "dist/presentation/renderer/overlay/overlay.css"],
  ["src/presentation/renderer/overlay/overlay.js", "dist/presentation/renderer/overlay/overlay.js"],
  ["src/presentation/renderer/grade-mark.css", "dist/presentation/renderer/grade-mark.css"],
  ["src/presentation/renderer/grade-mark.js", "dist/presentation/renderer/grade-mark.js"],
  ["src/presentation/renderer/fonts.css", "dist/presentation/renderer/fonts.css"],
  ["src/presentation/renderer/theme.css", "dist/presentation/renderer/theme.css"],
  ["src/presentation/renderer/press.css", "dist/presentation/renderer/press.css"],
  ["src/presentation/renderer/mvp.css", "dist/presentation/renderer/mvp.css"],
  ["src/presentation/renderer/press.js", "dist/presentation/renderer/press.js"],
  ["scripts/windows-ocr.ps1", "dist/scripts/windows-ocr.ps1"],
  ["scripts/league-window.ps1", "dist/scripts/league-window.ps1"],
  ["scripts/gdi-capture.ps1", "dist/scripts/gdi-capture.ps1"],
  ["scripts/ocr-worker.ps1", "dist/scripts/ocr-worker.ps1"],
];

copyTree("assets", "dist/assets");

function copyTree(fromRel, toRel) {
  const from = path.join(process.cwd(), fromRel);
  if (!fs.existsSync(from)) return;
  for (const name of fs.readdirSync(from)) {
    if (name.startsWith(".")) continue;
    const source = path.join(from, name);
    const nextFrom = `${fromRel}/${name}`;
    const nextTo = `${toRel}/${name}`;
    if (fs.statSync(source).isDirectory()) {
      copyTree(nextFrom, nextTo);
    } else {
      files.push([nextFrom, nextTo]);
    }
  }
}

const optional = [["secrets/aramgg-key.txt", "dist/secrets/aramgg-key.txt"]];

for (const [from, to] of files) copyIfChanged(from, to);
for (const [from, to] of optional) {
  if (!fs.existsSync(path.join(process.cwd(), from))) continue;
  copyIfChanged(from, to);
}

function copyIfChanged(fromRel, toRel) {
  const source = path.join(process.cwd(), fromRel);
  const dest = path.join(process.cwd(), toRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    const srcStat = fs.statSync(source);
    const destStat = fs.statSync(dest);
    if (srcStat.size === destStat.size && srcStat.mtimeMs <= destStat.mtimeMs) return;
  } catch {
    // dest missing
  }
  fs.copyFileSync(source, dest);
}
