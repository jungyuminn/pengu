import { describe, expect, it } from "vitest";
import { parseLeagueRect } from "./league-window";

describe("parseLeagueRect", () => {
  it("reads a client area", () => {
    expect(parseLeagueRect("120,80,1600,900\r\n")).toEqual({
      x: 120,
      y: 80,
      width: 1600,
      height: 900,
    });
  });

  it("ignores tiny or empty handles", () => {
    expect(parseLeagueRect("")).toBeNull();
    expect(parseLeagueRect("0,0,10,10")).toBeNull();
  });
});
