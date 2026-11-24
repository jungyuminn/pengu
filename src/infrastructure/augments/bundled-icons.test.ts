import { describe, expect, it } from "vitest";
import { bundledAugmentIconIndex, bundledAugmentIconUrl } from "./bundled-icons";

describe("bundledAugmentIconUrl", () => {
  it("points at the packaged augment png", () => {
    expect(bundledAugmentIconUrl("fortified.png")).toBe("../../../assets/augments/fortified.png");
  });
});

describe("bundledAugmentIconIndex", () => {
  it("indexes local files by augment id", () => {
    const map = bundledAugmentIconIndex([
      { id: 3265, file: "fortified.png" },
      { id: 0, file: "skip.png" },
    ]);
    expect(map.get(3265)).toBe("../../../assets/augments/fortified.png");
    expect(map.has(0)).toBe(false);
  });
});
