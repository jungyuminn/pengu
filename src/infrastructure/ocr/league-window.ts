import { parseLeagueRect, type PixelRect } from "./league-rect";
import { leagueClientBox, leagueClientFocused, type LeagueBox } from "./win-league";

export async function leagueGameRect(): Promise<PixelRect | null> {
  const box = leagueClientBox();
  if (!box) return null;
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

export { parseLeagueRect, leagueClientBox, leagueClientFocused };
export type { LeagueBox, PixelRect };
