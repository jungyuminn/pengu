import { describe, expect, it } from "vitest";
import { overlayFitKind } from "./overlay-fit";

describe("overlayFitKind", () => {
  it("seats the card band while hunting even before grades exist", () => {
    expect(
      overlayFitKind({
        armCards: true,
        cards: [],
        build: [{ name: "삼위일체", iconUrl: null }],
      }),
    ).toBe("cards");
  });

  it("keeps the card band once grades are on screen", () => {
    expect(
      overlayFitKind({
        cards: [{ slot: 0, query: "유레카", augment: null, catalogRank: null, catalogTotal: null, advice: null }],
        build: [],
      }),
    ).toBe("cards");
  });

  it("seats the pick grade on the champ select splash", () => {
    expect(
      overlayFitKind({
        champion: { name: "징크스", grade: "A" },
        cards: [],
        build: [],
      }),
    ).toBe("pick");
  });

  it("uses the build seat between augment picks", () => {
    expect(
      overlayFitKind({
        armCards: false,
        cards: [],
        build: [{ name: "삼위일체", iconUrl: null }],
      }),
    ).toBe("build");
  });
});
