const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const sizes = [16, 20, 24, 32, 40, 48, 64, 256];
const pngPath = path.join(process.cwd(), "assets/icons/pengu_icon.png");
const icoPath = path.join(process.cwd(), "assets/icons/pengu.ico");
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "pengu-icon-"));
const ps1Path = path.join(workDir, "resize.ps1");

const ps1 = `
Add-Type -AssemblyName System.Drawing
$srcPath = ${JSON.stringify(pngPath)}
$workDir = ${JSON.stringify(workDir)}
$img = [System.Drawing.Image]::FromFile($srcPath)
$sizes = @(${sizes.join(",")})
foreach ($size in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, 0, 0, $size, $size)
  $zoom = 1.2
  $draw = [int]($size * $zoom)
  $offset = [int](($size - $draw) / 2)
  $g.DrawImage($img, $offset, $offset, $draw, $draw)
  $bmp.Save((Join-Path $workDir "$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}
$img.Dispose()
`;

fs.writeFileSync(ps1Path, ps1);
execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1Path], {
  stdio: "inherit",
});

const images = sizes.map((size) => ({
  size,
  buffer: fs.readFileSync(path.join(workDir, `${size}.png`)),
}));
fs.writeFileSync(icoPath, packIco(images));
fs.rmSync(workDir, { recursive: true, force: true });

function packIco(images) {
  const count = images.length;
  const header = 6 + 16 * count;
  let offset = header;
  const entries = images.map((image) => {
    const entry = { ...image, offset, bytes: image.buffer.length };
    offset += image.buffer.length;
    return entry;
  });
  const out = Buffer.alloc(offset);
  out.writeUInt16LE(0, 0);
  out.writeUInt16LE(1, 2);
  out.writeUInt16LE(count, 4);
  let cursor = 6;
  for (const entry of entries) {
    out.writeUInt8(entry.size >= 256 ? 0 : entry.size, cursor);
    out.writeUInt8(entry.size >= 256 ? 0 : entry.size, cursor + 1);
    out.writeUInt8(0, cursor + 2);
    out.writeUInt8(0, cursor + 3);
    out.writeUInt16LE(1, cursor + 4);
    out.writeUInt16LE(32, cursor + 6);
    out.writeUInt32LE(entry.bytes, cursor + 8);
    out.writeUInt32LE(entry.offset, cursor + 12);
    cursor += 16;
  }
  for (const entry of entries) {
    entry.buffer.copy(out, entry.offset);
  }
  return out;
}
