$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class PenguWin {
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
  [DllImport("user32.dll")]
  public static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")]
  public static extern bool ClientToScreen(IntPtr hWnd, ref POINT lpPoint);
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  public struct POINT { public int X; public int Y; }
}
"@ | Out-Null

function Get-ClientLine([IntPtr]$hwnd) {
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
  return "{0},{1},{2},{3}" -f $point.X, $point.Y, $width, $height
}

$titles = @(
  "League of Legends (TM) Client",
  "League of Legends"
)
foreach ($title in $titles) {
  $line = Get-ClientLine ([PenguWin]::FindWindow($null, $title))
  if ($line) {
    [Console]::Out.WriteLine($line)
    exit 0
  }
}

$proc = Get-Process -Name "League of Legends" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($proc) {
  $line = Get-ClientLine $proc.MainWindowHandle
  if ($line) {
    [Console]::Out.WriteLine($line)
    exit 0
  }
}

exit 1
