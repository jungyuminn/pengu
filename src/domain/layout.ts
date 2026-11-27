export interface PercentRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const BASE_WIDTH = 1920;
export const BASE_HEIGHT = 1080;

export const DEFAULT_CARD_TITLES: PercentRect[] = [
  { x: 0.205, y: 0.245, width: 0.19, height: 0.1 },
  { x: 0.405, y: 0.245, width: 0.19, height: 0.1 },
  { x: 0.605, y: 0.245, width: 0.19, height: 0.1 },
];

export const OFFER_SLOTS: PercentRect[] = [
  { x: 0.2, y: 0.22, width: 0.19, height: 0.44 },
  { x: 0.405, y: 0.22, width: 0.19, height: 0.44 },
  { x: 0.61, y: 0.22, width: 0.19, height: 0.44 },
];

export const TITLE_STRIP: PercentRect = { x: 0.08, y: 0.28, width: 0.84, height: 0.18 };
export const TITLE_BAND: PercentRect = { x: 0.08, y: 0.12, width: 0.84, height: 0.28 };
export const CARD_BODY: PercentRect = { x: 0.18, y: 0.2, width: 0.64, height: 0.48 };
export const REROLL_BUTTON: PercentRect = { x: 0.42, y: 0.7, width: 0.16, height: 0.14 };
export const CARD_OVERLAY: PercentRect = { x: 0.225, y: 0.108, width: 0.55, height: 0.078 };
export const OFFER_CAPTURE_BANDS: PercentRect[] = [
  { x: 0, y: 0.12, width: 1, height: 0.34 },
  { x: 0, y: 0.62, width: 1, height: 0.16 },
];

export function titleSlotsInBand(cardCount: number): PercentRect[] {
  const slots = Math.min(6, Math.max(3, Math.round(cardCount) || 3));
  if (slots === DEFAULT_CARD_TITLES.length) return DEFAULT_CARD_TITLES.map(toBandRect);
  const y = (0.29 - TITLE_BAND.y) / TITLE_BAND.height;
  const height = 0.08 / TITLE_BAND.height;
  const pad = 0.02;
  const width = (1 - pad * 2) / slots;
  return Array.from({ length: slots }, (_, index) => ({
    x: pad + index * width,
    y,
    width: width - pad * 0.4,
    height,
  }));
}

function toBandRect(rect: PercentRect): PercentRect {
  return {
    x: (rect.x - TITLE_BAND.x) / TITLE_BAND.width,
    y: (rect.y - TITLE_BAND.y) / TITLE_BAND.height,
    width: rect.width / TITLE_BAND.width,
    height: rect.height / TITLE_BAND.height,
  };
}

export const BUILD_OVERLAY: PercentRect = { x: 0, y: 0.38, width: 0.1, height: 0.5 };
export const CHAMP_OVERLAY: PercentRect = { x: 0.03, y: 0.06, width: 0.32, height: 0.1 };
export const PICK_OVERLAY: PercentRect = { x: 0.72, y: 0.1, width: 0.16, height: 0.12 };
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
