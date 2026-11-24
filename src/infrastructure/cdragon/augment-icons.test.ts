import { describe, expect, it } from "vitest";
import { augmentIconIndex, cdragonAssetUrl } from "./augment-icons";

describe("cdragonAssetUrl", () => {
  it("maps kiwi and cherry game-data paths", () => {
    expect(cdragonAssetUrl("/lol-game-data/assets/ASSETS/UX/Kiwi/Augments/Icons/Fortified_large.png")).toBe(
      "https://raw.communitydragon.org/latest/game/assets/ux/kiwi/augments/icons/fortified_large.png",
    );
    expect(cdragonAssetUrl("/lol-game-data/assets/ASSETS/UX/Cherry/Augments/Icons/SlimeTime_large.png")).toBe(
      "https://raw.communitydragon.org/latest/game/assets/ux/cherry/augments/icons/slimetime_large.png",
    );
  });
});

describe("augmentIconIndex", () => {
  it("indexes large icons by id", () => {
    const map = augmentIconIndex([
      {
        id: 3265,
        augmentLargeIconPath: "/lol-game-data/assets/ASSETS/UX/Kiwi/Augments/Icons/Fortified_large.png",
      },
      { id: 1 },
    ]);
    expect(map.get(3265)).toContain("kiwi/augments/icons/fortified_large.png");
    expect(map.has(1)).toBe(false);
  });
});
