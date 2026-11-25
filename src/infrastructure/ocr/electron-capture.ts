import { nativeImage, screen } from "electron";
import screenshot from "screenshot-desktop";
import type { CapturePort } from "./capture";
import { leagueGameRect, type PixelRect } from "./league-window";

const DISPLAY_TTL_MS = 8000;

interface ShotDisplay {
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

let displayCache: { at: number; list: ShotDisplay[] } | null = null;

export class ElectronCapture implements CapturePort {
  async grabScreen(): Promise<{ buffer: Buffer; width: number; height: number }> {
    const league = await leagueGameRect();
    const displays = await listShotDisplays();
    const target = displayFor(league, displays);
    const raw = await screenshot({
      format: "png",
      ...(target ? { screen: target.id } : {}),
    });
    const image = nativeImage.createFromBuffer(raw);
    const cropped = cropToLeague(image, league, target);
    const size = cropped.getSize();
    return {
      buffer: cropped.toPNG(),
      width: size.width,
      height: size.height,
    };
  }

  crop(buffer: Buffer, rect: { x: number; y: number; width: number; height: number }): Buffer {
    return nativeImage.createFromBuffer(buffer).crop(rect).toPNG();
  }
}

async function listShotDisplays(): Promise<ShotDisplay[]> {
  if (displayCache && Date.now() - displayCache.at < DISPLAY_TTL_MS) return displayCache.list;
  try {
    const list = (await screenshot.listDisplays())
      .map((row) => ({
        id: String(row.id),
        left: Number(row.left) || 0,
        top: Number(row.top) || 0,
        right: Number(row.right) || (Number(row.left) || 0) + (Number(row.width) || 0),
        bottom: Number(row.bottom) || (Number(row.top) || 0) + (Number(row.height) || 0),
      }))
      .filter((row) => row.right > row.left && row.bottom > row.top);
    displayCache = { at: Date.now(), list };
    return list;
  } catch {
    displayCache = { at: Date.now(), list: [] };
    return [];
  }
}

function displayFor(league: PixelRect | null, displays: ShotDisplay[]): ShotDisplay | null {
  if (!league || !displays.length) return displays[0] ?? null;
  const x = league.x + league.width / 2;
  const y = league.y + league.height / 2;
  return (
    displays.find((row) => x >= row.left && x < row.right && y >= row.top && y < row.bottom) ??
    displays[0] ??
    null
  );
}

function cropToLeague(
  image: Electron.NativeImage,
  league: PixelRect | null,
  display: ShotDisplay | null,
): Electron.NativeImage {
  if (!league) return image;
  const originX = display?.left ?? Math.round(screen.getPrimaryDisplay().bounds.x * screen.getPrimaryDisplay().scaleFactor);
  const originY = display?.top ?? Math.round(screen.getPrimaryDisplay().bounds.y * screen.getPrimaryDisplay().scaleFactor);
  const size = image.getSize();
  const x = Math.max(0, league.x - originX);
  const y = Math.max(0, league.y - originY);
  const width = Math.min(league.width, size.width - x);
  const height = Math.min(league.height, size.height - y);
  if (width < 200 || height < 200) return image;
  return image.crop({ x, y, width, height });
}
