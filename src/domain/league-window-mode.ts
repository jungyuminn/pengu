export const LEAGUE_FULLSCREEN = 0;
export const LEAGUE_WINDOWED = 1;
export const LEAGUE_BORDERLESS = 2;

export type LeagueWindowKind = "fullscreen" | "windowed" | "borderless" | "unknown";

export function leagueWindowKind(value: number | null | undefined): LeagueWindowKind {
  if (value === LEAGUE_FULLSCREEN) return "fullscreen";
  if (value === LEAGUE_WINDOWED) return "windowed";
  if (value === LEAGUE_BORDERLESS) return "borderless";
  return "unknown";
}

export function overlayWindowMode(current: number | null | undefined): number | null {
  if (current !== LEAGUE_FULLSCREEN) return null;
  return LEAGUE_BORDERLESS;
}

export function applyOverlayWindowModeToCfg(text: string): { text: string; changed: boolean } {
  if (overlayWindowMode(parseWindowMode(text)) == null) {
    return { text, changed: false };
  }
  const next = text.replace(/^(WindowMode\s*=\s*)0(\s*)$/m, `$1${LEAGUE_BORDERLESS}$2`);
  return { text: next, changed: next !== text };
}

export function parseWindowMode(text: string): number | null {
  const match = text.match(/^WindowMode\s*=\s*(-?\d+)\s*$/m);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) ? value : null;
}
