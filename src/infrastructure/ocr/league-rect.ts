export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function parseLeagueRect(text: string): PixelRect | null {
  const match = text.trim().match(/^(-?\d+),(-?\d+),(\d+),(\d+)$/m);
  if (!match) return null;
  const rect = {
    x: Number(match[1]),
    y: Number(match[2]),
    width: Number(match[3]),
    height: Number(match[4]),
  };
  if (rect.width < 200 || rect.height < 200) return null;
  return rect;
}
