$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$WarningPreference = "SilentlyContinue"

Add-Type -AssemblyName System.Drawing | Out-Null
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
  public static List<long> HideOverlays() {
    var found = OverlayHandles();
    foreach (long handle in found) {
      if (handle == 0) continue;
      ShowWindow(new IntPtr(handle), 0);
    }
    return found;
  }
  public static void ShowOverlays(List<long> handles) {
    if (handles == null) return;
    foreach (long handle in handles) {
      if (handle == 0) continue;
      ShowWindow(new IntPtr(handle), 8);
    }
  }
}
"@ | Out-Null

try {
  [void][PenguWin]::SetProcessDpiAwareness(2)
} catch {
  [void][PenguWin]::SetProcessDPIAware()
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
  try {
    return [PenguWin]::HideOverlays()
  } catch {
    return New-Object System.Collections.Generic.List[Int64]
  }
}

function Show-PenguOverlay($hidden) {
  try {
    [PenguWin]::ShowOverlays($hidden)
  } catch {
    return
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

function Capture-TitleStrip([double]$rx, [double]$ry, [double]$rw, [double]$rh, [string]$outPng, [bool]$hideOverlay) {
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
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $graphics = [System.Drawing.Graphics]::FromImage($bmp)
  try {
    $graphics.CopyFromScreen(($box.X + $cropX), ($box.Y + $cropY), 0, 0, $bmp.Size)
    if (Test-BlackCapture $bmp) {
      Copy-LeagueCrop $box $graphics $cropX $cropY $w $h
    }
    $folder = [System.IO.Path]::GetDirectoryName($outPng)
    if ($folder) { [void][System.IO.Directory]::CreateDirectory($folder) }
    $bmp.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $bmp.Dispose()
    if ($hideOverlay) { Show-PenguOverlay $hidden }
  }
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
      $outPng = Join-Path $outDir "band.png"
      [void][System.IO.Directory]::CreateDirectory($outDir)
      $status = Capture-TitleStrip ([double]$bits[1]) ([double]$bits[2]) ([double]$bits[3]) ([double]$bits[4]) $outPng $hide
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
