import { describe, expect, it } from "vitest";
import { BundledAugmentDescriptions } from "./bundled-descriptions";

describe("BundledAugmentDescriptions", () => {
  it("loads korean text for a known augment", async () => {
    const texts = await new BundledAugmentDescriptions().fetch();
    expect(texts.get(1004)).toMatch(/궁극기/);
    expect(texts.get(2141)).toMatch(/히드라/);
    expect(texts.get(3265)).toMatch(/방어력/);
  });
});
