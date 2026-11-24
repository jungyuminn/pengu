export interface PercentRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const BASE_WIDTH = 1920;
export const BASE_HEIGHT = 1080;

export const DEFAULT_CARD_TITLES: PercentRect[] = [
  { x: 0.215, y: 0.29, width: 0.175, height: 0.08 },
  { x: 0.412, y: 0.29, width: 0.175, height: 0.08 },
  { x: 0.61, y: 0.29, width: 0.175, height: 0.08 },
];

export function scaleRect(
  rect: PercentRect,
  screenWidth: number,
  screenHeight: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.round(rect.x * screenWidth),
    y: Math.round(rect.y * screenHeight),
    width: Math.round(rect.width * screenWidth),
    height: Math.round(rect.height * screenHeight),
  };
}
