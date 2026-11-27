export interface SlideRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function originInBounds(bounds: SlideRect, origin: SlideRect | null): { x: number; y: number } {
  if (!origin) return { x: 50, y: 100 };
  const x = ((origin.x + origin.width / 2 - bounds.x) / Math.max(1, bounds.width)) * 100;
  const y = ((origin.y + origin.height / 2 - bounds.y) / Math.max(1, bounds.height)) * 100;
  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  };
}
