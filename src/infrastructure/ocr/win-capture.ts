import type { PercentRect } from "../../domain/layout";
import { OFFER_CAPTURE_BANDS, scaleRect } from "../../domain/layout";
import type { RgbaBitmap } from "./band-bitmap";
import type { LeagueBox } from "./win-league";
import {
  CreateCompatibleBitmap,
  CreateCompatibleDC,
  DeleteDC,
  DeleteObject,
  GetDC,
  GetDIBits,
  PrintWindow,
  PW_RENDERFULLCONTENT,
  ReleaseDC,
  SelectObject,
} from "./win32";

export function captureClient(box: LeagueBox): RgbaBitmap | null {
  const fromWindow = grabWindow(box);
  if (fromWindow && !isBlack(fromWindow)) return fromWindow;
  return null;
}

export function cropClientPercent(shot: RgbaBitmap, rect: PercentRect): RgbaBitmap | null {
  const region = scaleRect(rect, shot.width, shot.height);
  if (region.width < 8 || region.height < 8) return null;
  return crop(shot, region);
}

export function captureClientPercent(box: LeagueBox, rect: PercentRect): RgbaBitmap | null {
  const shot = captureClient(box);
  if (!shot) return null;
  return cropClientPercent(shot, rect);
}

function grabWindow(box: LeagueBox): RgbaBitmap | null {
  const windowDc = GetDC(box.hwnd);
  if (!windowDc) return null;
  const memory = CreateCompatibleDC(windowDc);
  const bitmap = CreateCompatibleBitmap(windowDc, box.width, box.height);
  const previous = SelectObject(memory, bitmap);
  try {
    if (!PrintWindow(box.hwnd, memory, PW_RENDERFULLCONTENT)) PrintWindow(box.hwnd, memory, 0);
    return readBits(memory, bitmap, box.width, box.height);
  } finally {
    SelectObject(memory, previous);
    DeleteObject(bitmap);
    DeleteDC(memory);
    ReleaseDC(box.hwnd, windowDc);
  }
}

let reuseBgra: Buffer | null = null;
let reuseRgba: Buffer | null = null;
let reuseBytes = 0;

function readBits(hdc: unknown, bitmap: unknown, width: number, height: number): RgbaBitmap | null {
  const header = {
    biSize: 40,
    biWidth: width,
    biHeight: -height,
    biPlanes: 1,
    biBitCount: 32,
    biCompression: 0,
    biSizeImage: 0,
    biXPelsPerMeter: 0,
    biYPelsPerMeter: 0,
    biClrUsed: 0,
    biClrImportant: 0,
  };
  const bytes = width * height * 4;
  const { bgra, rgba } = captureBuffers(bytes);
  const copied = GetDIBits(hdc, bitmap, 0, height, bgra, header, 0);
  if (!copied) return null;
  rgba.fill(0);
  for (const band of OFFER_CAPTURE_BANDS) {
    copyBand(bgra, rgba, width, height, band.y, band.height);
  }
  return { width, height, data: rgba };
}

function copyBand(
  bgra: Buffer,
  rgba: Buffer,
  width: number,
  height: number,
  y: number,
  bandHeight: number,
): void {
  const y0 = Math.max(0, Math.floor(y * height));
  const y1 = Math.min(height, Math.max(y0 + 1, Math.ceil((y + bandHeight) * height)));
  const rowBytes = width * 4;
  for (let row = y0; row < y1; row += 1) {
    const start = row * rowBytes;
    const end = start + rowBytes;
    for (let i = start; i < end; i += 4) {
      rgba[i] = bgra[i + 2] ?? 0;
      rgba[i + 1] = bgra[i + 1] ?? 0;
      rgba[i + 2] = bgra[i] ?? 0;
      rgba[i + 3] = 255;
    }
  }
}

function captureBuffers(bytes: number): { bgra: Buffer; rgba: Buffer } {
  if (reuseBytes !== bytes || !reuseBgra || !reuseRgba) {
    reuseBgra = Buffer.alloc(bytes);
    reuseRgba = Buffer.alloc(bytes);
    reuseBytes = bytes;
  }
  return { bgra: reuseBgra, rgba: reuseRgba };
}

function crop(bitmap: RgbaBitmap, rect: { x: number; y: number; width: number; height: number }): RgbaBitmap {
  const x = Math.max(0, Math.min(bitmap.width - 1, rect.x));
  const y = Math.max(0, Math.min(bitmap.height - 1, rect.y));
  const width = Math.max(8, Math.min(rect.width, bitmap.width - x));
  const height = Math.max(8, Math.min(rect.height, bitmap.height - y));
  const data = Buffer.alloc(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const src = ((y + row) * bitmap.width + x) * 4;
    bitmap.data.copy(data, row * width * 4, src, src + width * 4);
  }
  return { width, height, data };
}

function isBlack(bitmap: RgbaBitmap): boolean {
  let dark = 0;
  let n = 0;
  for (const band of OFFER_CAPTURE_BANDS) {
    const y0 = Math.max(8, Math.floor(band.y * bitmap.height));
    const y1 = Math.min(bitmap.height, Math.ceil((band.y + band.height) * bitmap.height));
    for (let y = y0; y < y1; y += 48) {
      for (let x = 8; x < bitmap.width; x += 48) {
        const i = (y * bitmap.width + x) * 4;
        n += 1;
        if ((bitmap.data[i] ?? 0) + (bitmap.data[i + 1] ?? 0) + (bitmap.data[i + 2] ?? 0) < 12) dark += 1;
      }
    }
  }
  return n > 0 && dark / n > 0.97;
}
