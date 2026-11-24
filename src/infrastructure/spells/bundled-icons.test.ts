import { describe, expect, it } from "vitest";
import { bundledSpellIconUrl, spellIconLookup } from "./bundled-icons";

describe("bundledSpellIconUrl", () => {
  it("points at the packaged spell png", () => {
    expect(bundledSpellIconUrl("flash.png")).toBe("../../../assets/spells/flash.png");
  });
});

describe("spellIconLookup", () => {
  it("indexes by id and names", () => {
    const map = spellIconLookup([{ id: 4, file: "flash.png", names: ["점멸", "Flash", "闪现"] }]);
    expect(map.get("4")).toBe("../../../assets/spells/flash.png");
    expect(map.get("점멸")).toBe("../../../assets/spells/flash.png");
    expect(map.get("flash")).toBe("../../../assets/spells/flash.png");
  });
});
