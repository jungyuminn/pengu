import { describe, expect, it } from "vitest";
import {
  applyOverlayWindowModeToCfg,
  leagueWindowKind,
  overlayWindowMode,
  parseWindowMode,
} from "./league-window-mode";

describe("overlayWindowMode", () => {
  it("only converts exclusive fullscreen to borderless", () => {
    expect(overlayWindowMode(0)).toBe(2);
    expect(overlayWindowMode(1)).toBeNull();
    expect(overlayWindowMode(2)).toBeNull();
    expect(overlayWindowMode(null)).toBeNull();
  });
});

describe("leagueWindowKind", () => {
  it("labels the three League video modes", () => {
    expect(leagueWindowKind(0)).toBe("fullscreen");
    expect(leagueWindowKind(1)).toBe("windowed");
    expect(leagueWindowKind(2)).toBe("borderless");
  });
});

describe("applyOverlayWindowModeToCfg", () => {
  it("rewrites fullscreen and leaves windowed lines alone", () => {
    const fullscreen = "[General]\r\nWindowMode=0\r\nWidth=1920\r\n";
    expect(applyOverlayWindowModeToCfg(fullscreen)).toEqual({
      text: "[General]\r\nWindowMode=2\r\nWidth=1920\r\n",
      changed: true,
    });

    const windowed = "[General]\nWindowMode=1\n";
    expect(applyOverlayWindowModeToCfg(windowed)).toEqual({ text: windowed, changed: false });
  });

  it("reads the WindowMode integer", () => {
    expect(parseWindowMode("WindowMode=0\n")).toBe(0);
    expect(parseWindowMode("[HUD]\nNameTagDisplay=1\n[General]\nWindowMode=2\n")).toBe(2);
  });
});
