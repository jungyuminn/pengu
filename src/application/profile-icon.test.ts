import { describe, expect, it } from "vitest";
import { profileIconUrl } from "./profile-icon";

describe("profileIconUrl", () => {
  it("builds a CommunityDragon url for a summoner icon id", () => {
    expect(profileIconUrl(29)).toBe("https://cdn.communitydragon.org/latest/profile-icon/29");
    expect(profileIconUrl(0)).toBe("https://cdn.communitydragon.org/latest/profile-icon/0");
  });

  it("skips missing ids", () => {
    expect(profileIconUrl(null)).toBeNull();
    expect(profileIconUrl(undefined)).toBeNull();
    expect(profileIconUrl(-1)).toBeNull();
    expect(profileIconUrl(1.5)).toBeNull();
  });
});
