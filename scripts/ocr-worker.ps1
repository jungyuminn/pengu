$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$WarningPreference = "SilentlyContinue"

Add-Type -AssemblyName System.Drawing | Out-Null
Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
Add-Type -ReferencedAssemblies System.Drawing @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class PenguCards {
  static readonly double[] FillYs = new double[] { 0.58, 0.66, 0.74, 0.82 };
  public static int Count(Bitmap bmp) {
    if (bmp == null || bmp.Width < 32 || bmp.Height < 32) return 0;
    Bitmap copy = new Bitmap(bmp.Width, bmp.Height, PixelFormat.Format32bppArgb);
    using (Graphics g = Graphics.FromImage(copy)) g.DrawImage(bmp, 0, 0, bmp.Width, bmp.Height);
    Rectangle rect = new Rectangle(0, 0, copy.Width, copy.Height);
    BitmapData data = copy.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    try {
      int stride = Math.Abs(data.Stride);
      byte[] bytes = new byte[stride * copy.Height];
      Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
      return CountTops(bytes, stride, copy.Width, copy.Height);
    } finally {
      copy.UnlockBits(data);
      copy.Dispose();
    }
  }
  static int CountTops(byte[] px, int stride, int w, int h) {
    int minRun = Math.Max(16, (int)Math.Round(w * 0.08));
    int maxRun = (int)Math.Round(w * 0.36);
    int gap = Math.Max(4, (int)Math.Round(w * 0.012));
    var runs = new List<int[]>();
    int yEnd = Clamp((int)Math.Round(h * 0.32), 8, h - 1);
    for (int y = 1; y <= yEnd; y += 4) {
      CollectRuns(px, stride, w, y, minRun, maxRun, gap, runs);
    }
    var clusters = Cluster(runs);
    int cards = 0;
    for (int i = 0; i < clusters.Count; i++) {
      int[] c = clusters[i];
      int span = c[1] - c[0];
      if (c[2] < 1 || span < minRun || span > maxRun) continue;
      if (FillRatio(px, stride, w, h, c[0], c[1]) < 0.2) continue;
      cards++;
    }
    return cards;
  }
  static void CollectRuns(byte[] px, int stride, int w, int y, int minRun, int maxRun, int gap, List<int[]> runs) {
    int start = -1, last = -1;
    for (int x = 0; x < w; x += 2) {
      if (Metal(px, stride, x, y)) {
        if (start < 0) start = x;
        last = x;
        continue;
      }
      if (start >= 0 && x - last <= gap) continue;
      AddRun(runs, start, last, minRun, maxRun);
      start = -1;
      last = -1;
    }
    AddRun(runs, start, last, minRun, maxRun);
  }
  static void AddRun(List<int[]> runs, int start, int last, int minRun, int maxRun) {
    if (start < 0 || last < start) return;
    int span = last - start;
    if (span < minRun || span > maxRun) return;
    runs.Add(new int[] { start, last });
  }
  static List<int[]> Cluster(List<int[]> runs) {
    var clusters = new List<int[]>();
    runs.Sort(delegate(int[] a, int[] b) {
      int d = a[0] - b[0];
      return d != 0 ? d : a[1] - b[1];
    });
    for (int i = 0; i < runs.Count; i++) {
      int[] run = runs[i];
      int hit = -1;
      for (int c = 0; c < clusters.Count; c++) {
        if (run[0] < clusters[c][1] && run[1] > clusters[c][0]) { hit = c; break; }
      }
      if (hit < 0) {
        clusters.Add(new int[] { run[0], run[1], 1 });
        continue;
      }
      clusters[hit][0] = Math.Min(clusters[hit][0], run[0]);
      clusters[hit][1] = Math.Max(clusters[hit][1], run[1]);
      clusters[hit][2]++;
    }
    return clusters;
  }
  static double FillRatio(byte[] px, int stride, int w, int h, int x0, int x1) {
    int left = Clamp(x0 + (int)Math.Round((x1 - x0) * 0.18), 0, w - 1);
    int right = Clamp(x1 - (int)Math.Round((x1 - x0) * 0.18), left, w - 1);
    int dark = 0, n = 0;
    for (int t = 0; t < FillYs.Length; t++) {
      int y = Clamp((int)Math.Round(h * FillYs[t]), 0, h - 1);
      for (int x = left; x <= right; x += 8) {
        n++;
        if (Fill(px, stride, x, y)) dark++;
      }
    }
    return n == 0 ? 0 : dark / (double)n;
  }
  static int Clamp(int value, int min, int max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }
  static bool Metal(byte[] px, int stride, int x, int y) {
    int i = y * stride + x * 4;
    if (i < 0 || i + 2 >= px.Length) return false;
    int b = px[i], g = px[i + 1], r = px[i + 2];
    int max = Math.Max(r, Math.Max(g, b));
    int min = Math.Min(r, Math.Min(g, b));
    if (r >= 140 && g >= 100 && b <= 120 && r >= b + 35) return true;
    if (max >= 125 && max - min <= 48) return true;
    if (max >= 130 && max - min >= 55) {
      if (b >= r + 50 && b >= g + 30 && g < 160) return false;
      return true;
    }
    return false;
  }
  static bool Fill(byte[] px, int stride, int x, int y) {
    int i = y * stride + x * 4;
    if (i < 0 || i + 2 >= px.Length) return false;
    return px[i] + px[i + 1] + px[i + 2] < 140;
  }
}
"@ | Out-Null
Add-Type @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class PenguWin {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
  [DllImport("user32.dll")]
  public static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")]
  public static extern bool ClientToScreen(IntPtr hWnd, ref POINT lpPoint);
  [DllImport("user32.dll")]
  public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")]
  public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll")]
  public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern bool SetProcessDPIAware();
  [DllImport("shcore.dll")]
  public static extern int SetProcessDpiAwareness(int awareness);
  [DllImport("user32.dll")]
  public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdcBlt, uint nFlags);
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  public struct POINT { public int X; public int Y; }
  public static List<long> OverlayHandles() {
    var found = new List<long>();
    EnumWindows((h, l) => {
      var sb = new StringBuilder(256);
      GetWindowText(h, sb, 256);
      if (sb.ToString() == "Pengu Overlay" && IsWindowVisible(h)) found.Add(h.ToInt64());
      return true;
    }, IntPtr.Zero);
    return found;
  }
}
"@ | Out-Null

try {
  [void][PenguWin]::SetProcessDpiAwareness(2)
} catch {
  [void][PenguWin]::SetProcessDPIAware()
}

$asTaskGeneric = @(
  [System.WindowsRuntimeSystemExtensions].GetMethods() |
  Where-Object {
    $_.Name -eq "AsTask" -and
    $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
  }
)[0]

function Await-WinRT($operation, [type]$resultType) {
  $asTask = $asTaskGeneric.MakeGenericMethod($resultType)
  $task = $asTask.Invoke($null, @($operation))
  $task.Wait(-1) | Out-Null
  return $task.Result
}

[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null

$ocrKo = $null
$ocrEn = $null
if ($asTaskGeneric) {
  foreach ($tag in @("ko-KR", "ko")) {
    if ($ocrKo) { break }
    try { $ocrKo = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage((New-Object Windows.Globalization.Language $tag)) } catch { $ocrKo = $null }
  }
  foreach ($tag in @("en-US", "en")) {
    if ($ocrEn) { break }
    try { $ocrEn = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage((New-Object Windows.Globalization.Language $tag)) } catch { $ocrEn = $null }
  }
  if (-not $ocrKo) {
    $ocrKo = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  }
}

function Invoke-Ocr($bitmap, $engine) {
  if (-not $engine) { return $null }
  return Await-WinRT ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
}

function Ocr-HasHangul($result) {
  if (-not $result) { return $false }
  foreach ($ocrLine in @($result.Lines)) {
    if ($ocrLine -and [string]$ocrLine.Text -match "[\uac00-\ud7a3]") { return $true }
  }
  return $false
}

function Get-ClientBox([IntPtr]$hwnd) {
  if ($hwnd -eq [IntPtr]::Zero) { return $null }
  $rect = New-Object PenguWin+RECT
  [void][PenguWin]::GetClientRect($hwnd, [ref]$rect)
  $width = $rect.Right - $rect.Left
  $height = $rect.Bottom - $rect.Top
  if ($width -lt 200 -or $height -lt 200) { return $null }
  $point = New-Object PenguWin+POINT
  $point.X = 0
  $point.Y = 0
  [void][PenguWin]::ClientToScreen($hwnd, [ref]$point)
  return @{ Hwnd = $hwnd; X = $point.X; Y = $point.Y; Width = $width; Height = $height }
}

function Get-LeagueBox {
  foreach ($title in @("League of Legends (TM) Client", "League of Legends")) {
    $box = Get-ClientBox ([PenguWin]::FindWindow($null, $title))
    if ($box) { return $box }
  }
  $proc = Get-Process -Name "League of Legends" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($proc) { return Get-ClientBox $proc.MainWindowHandle }
  return $null
}

function Count-OfferCards($bmp) {
  return [PenguCards]::Count($bmp)
}

function Write-OcrPayload([string]$outText, [int]$w, [int]$h, [int]$cards, [string]$hint, $lines) {
  $payload = @{
    w = $w
    h = $h
    cards = $cards
    hint = $hint
    lines = @($lines)
  }
  $json = $payload | ConvertTo-Json -Compress -Depth 5
  $folder = [System.IO.Path]::GetDirectoryName($outText)
  if ($folder) { [void][System.IO.Directory]::CreateDirectory($folder) }
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($outText, $json, $utf8)
}

function Test-BlackCapture($bmp) {
  $dark = 0
  $n = 0
  for ($i = 8; $i -lt $bmp.Width; $i += 48) {
    for ($j = 8; $j -lt $bmp.Height; $j += 48) {
      $c = $bmp.GetPixel($i, $j)
      $n += 1
      if (($c.R + $c.G + $c.B) -lt 12) { $dark += 1 }
    }
  }
  return $n -gt 0 -and ($dark / $n) -gt 0.97
}

function Hide-PenguOverlay {
  $hidden = New-Object System.Collections.Generic.List[Int64]
  foreach ($handle in [PenguWin]::OverlayHandles()) {
    [void][PenguWin]::ShowWindow([IntPtr]$handle, 0)
    $hidden.Add($handle)
  }
  return $hidden
}

function Show-PenguOverlay($hidden) {
  foreach ($handle in @($hidden)) {
    [void][PenguWin]::ShowWindow([IntPtr]$handle, 8)
  }
}

function Ocr-CropText($crop, [string]$bmpPath) {
  Save-OcrBitmap $crop $bmpPath
  $file = Await-WinRT ([Windows.Storage.StorageFile]::GetFileFromPathAsync($bmpPath)) ([Windows.Storage.StorageFile])
  $stream = Await-WinRT ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  try {
    $decoder = Await-WinRT ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await-WinRT ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    if (
      $bitmap.BitmapPixelFormat -ne [Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8 -or
      $bitmap.BitmapAlphaMode -ne [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied
    ) {
      $bitmap = [Windows.Graphics.Imaging.SoftwareBitmap]::Convert(
        $bitmap,
        [Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8,
        [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied
      )
    }
    $result = Invoke-Ocr $bitmap $ocrKo
    if (-not (Ocr-HasHangul $result) -and $ocrEn) {
      $english = Invoke-Ocr $bitmap $ocrEn
      if ($english -and @($english.Lines).Count -gt 0) { $result = $english }
    }
    if (-not $result) { return "" }
    $parts = New-Object System.Collections.Generic.List[string]
    foreach ($ocrLine in @($result.Lines)) {
      if (-not $ocrLine) { continue }
      $text = ([string]$ocrLine.Text).Trim()
      if ($text) { [void]$parts.Add($text) }
    }
    return ($parts -join " ").Trim()
  } finally {
    $stream.Dispose()
  }
}

function Read-CardSlotLines($src, [int]$cardCount) {
  $slots = [Math]::Min(6, [Math]::Max(3, $cardCount))
  $padX = [Math]::Max(4, [int][Math]::Round($src.Width * 0.02))
  $slotW = [Math]::Max(8, [int][Math]::Floor($src.Width / $slots))
  $titleY = [Math]::Max(0, [int][Math]::Round($src.Height * 0.22))
  $titleH = [Math]::Max(16, [int][Math]::Round($src.Height * 0.72))
  if ($titleY + $titleH -gt $src.Height) { $titleH = $src.Height - $titleY }
  $lines = New-Object System.Collections.ArrayList
  for ($i = 0; $i -lt $slots; $i++) {
    $x = ($i * $slotW) + $padX
    $w = [Math]::Max(8, $slotW - (2 * $padX))
    if ($x + $w -gt $src.Width) { $w = $src.Width - $x }
    if ($w -lt 8 -or $titleH -lt 8) { continue }
    $rect = New-Object System.Drawing.Rectangle $x, $titleY, $w, $titleH
    $crop = $src.Clone($rect, $src.PixelFormat)
    $bmpPath = Join-Path $env:TEMP ("pengu-ocr-slot-" + [guid]::NewGuid().ToString("n") + ".bmp")
    try {
      $text = Ocr-CropText $crop $bmpPath
      if (-not $text) { continue }
      [void]$lines.Add(@{
        t = $text
        x = $x
        y = $titleY
        w = $w
        h = $titleH
      })
    } catch {
      continue
    } finally {
      $crop.Dispose()
      Remove-Item -LiteralPath $bmpPath -Force -ErrorAction SilentlyContinue
    }
  }
  return @($lines.ToArray())
}

function Save-OcrBitmap($src, [string]$bmpPath) {
  $scale = 2
  $wide = New-Object System.Drawing.Bitmap ($src.Width * $scale), ($src.Height * $scale)
  $scaled = [System.Drawing.Graphics]::FromImage($wide)
  $attrs = New-Object System.Drawing.Imaging.ImageAttributes
  $matrix = New-Object System.Drawing.Imaging.ColorMatrix
  $matrix.Matrix00 = 1.7
  $matrix.Matrix11 = 1.7
  $matrix.Matrix22 = 1.7
  $matrix.Matrix33 = 1
  $matrix.Matrix40 = -0.18
  $matrix.Matrix41 = -0.18
  $matrix.Matrix42 = -0.18
  $attrs.SetColorMatrix($matrix)
  try {
    $scaled.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $scaled.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $scaled.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $dest = New-Object System.Drawing.Rectangle 0, 0, $wide.Width, $wide.Height
    $scaled.DrawImage($src, $dest, 0, 0, $src.Width, $src.Height, [System.Drawing.GraphicsUnit]::Pixel, $attrs)
    $wide.Save($bmpPath, [System.Drawing.Imaging.ImageFormat]::Bmp)
  } finally {
    $attrs.Dispose()
    $scaled.Dispose()
    $wide.Dispose()
  }
}

function Copy-LeagueCrop($box, $graphics, [int]$cropX, [int]$cropY, [int]$w, [int]$h) {
  $full = New-Object System.Drawing.Bitmap $box.Width, $box.Height
  $fullG = [System.Drawing.Graphics]::FromImage($full)
  try {
    foreach ($flag in @(2, 0)) {
      $hdc = $fullG.GetHdc()
      try {
        [void][PenguWin]::PrintWindow($box.Hwnd, $hdc, $flag)
      } finally {
        $fullG.ReleaseHdc($hdc)
      }
      if (-not (Test-BlackCapture $full)) { break }
    }
    $dest = New-Object System.Drawing.Rectangle 0, 0, $w, $h
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.DrawImage($full, $dest, $cropX, $cropY, $w, $h, [System.Drawing.GraphicsUnit]::Pixel)
  } finally {
    $fullG.Dispose()
    $full.Dispose()
  }
}

function Read-TitleStrip([double]$rx, [double]$ry, [double]$rw, [double]$rh, [string]$outText, [bool]$hideOverlay) {
  $box = Get-LeagueBox
  if (-not $box) { return "NOWINDOW" }
  $cropX = [Math]::Max(0, [Math]::Round($box.Width * $rx))
  $cropY = [Math]::Max(0, [Math]::Round($box.Height * $ry))
  $w = [Math]::Max(8, [Math]::Round($box.Width * $rw))
  $h = [Math]::Max(8, [Math]::Round($box.Height * $rh))
  if ($cropX + $w -gt $box.Width) { $w = $box.Width - $cropX }
  if ($cropY + $h -gt $box.Height) { $h = $box.Height - $cropY }
  $hidden = @()
  if ($hideOverlay) {
    $hidden = Hide-PenguOverlay
    Start-Sleep -Milliseconds 40
  }
  $cardCount = 0
  $hint = ""
  $ocrLines = @()
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $graphics = [System.Drawing.Graphics]::FromImage($bmp)
  try {
    $graphics.CopyFromScreen(($box.X + $cropX), ($box.Y + $cropY), 0, 0, $bmp.Size)
    if (Test-BlackCapture $bmp) {
      Copy-LeagueCrop $box $graphics $cropX $cropY $w $h
    }
    $cardCount = Count-OfferCards $bmp
    if ($cardCount -ge 3) {
      if (-not $ocrKo -and -not $ocrEn) { $hint = "no-ocr" }
      else { $ocrLines = @(Read-CardSlotLines $bmp $cardCount) }
    }
  } finally {
    $graphics.Dispose()
    $bmp.Dispose()
    if ($hideOverlay) { Show-PenguOverlay $hidden }
  }
  Write-OcrPayload $outText $w $h $cardCount $hint $ocrLines
  return "OK"
}

[Console]::Out.WriteLine("READY")
[Console]::Out.Flush()

while ($true) {
  $raw = [Console]::In.ReadLine()
  if ($null -eq $raw) { break }
  $raw = $raw.Trim()
  if ($raw -eq "QUIT") { break }
  if ($raw -eq "PING") {
    [Console]::Out.WriteLine("PONG")
    [Console]::Out.Flush()
    continue
  }
  $bits = $raw.Split([char]'|')
  try {
    if ($bits.Count -ge 7 -and $bits[0] -eq "SCAN") {
      $hide = $bits[5] -eq "1"
      $outDir = Join-Path $env:TEMP $bits[6]
      $outText = Join-Path $outDir "card.txt"
      [void][System.IO.Directory]::CreateDirectory($outDir)
      $status = Read-TitleStrip ([double]$bits[1]) ([double]$bits[2]) ([double]$bits[3]) ([double]$bits[4]) $outText $hide
      [Console]::Out.WriteLine($status)
    } else {
      [Console]::Out.WriteLine("ERR")
    }
  } catch {
    $msg = [string]$_.Exception.Message
    $msg = $msg -replace '[|\r\n]+', ' '
    [Console]::Out.WriteLine("ERR|$msg")
  }
  [Console]::Out.Flush()
}
