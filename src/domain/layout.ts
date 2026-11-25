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

export const TITLE_STRIP: PercentRect = { x: 0.08, y: 0.28, width: 0.84, height: 0.18 };
export const TITLE_BAND: PercentRect = { x: 0.08, y: 0.08, width: 0.84, height: 0.52 };
export const CARD_OVERLAY: PercentRect = { x: 0.175, y: 0.195, width: 0.65, height: 0.09 };
export const BUILD_OVERLAY: PercentRect = { x: 0, y: 0.38, width: 0.1, height: 0.5 };
export const CHAMP_OVERLAY: PercentRect = { x: 0.03, y: 0.06, width: 0.32, height: 0.1 };
export const NOTICE_OVERLAY: PercentRect = { x: 0.18, y: 0.05, width: 0.64, height: 0.12 };
export const GAME_OVERLAY: PercentRect = { x: 0, y: 0, width: 1, height: 1 };

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
