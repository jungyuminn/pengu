import { describe, expect, it } from "vitest";
import { bundledChampionIconUrl, championIconFileName } from "./bundled-icons";

describe("championIconFileName", () => {
  it("uses the lowercase english key", () => {
    expect(championIconFileName("TahmKench")).toBe("tahmkench.png");
    expect(championIconFileName("MissFortune")).toBe("missfortune.png");
  });
});

describe("bundledChampionIconUrl", () => {
  it("points at the packaged portrait", () => {
    expect(bundledChampionIconUrl("Olaf")).toBe("../../../assets/champions/olaf.png");
    expect(bundledChampionIconUrl("")).toBeNull();
  });
});
