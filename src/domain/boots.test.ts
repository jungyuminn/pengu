import { describe, expect, it } from "vitest";
import { isBootItem, withoutBoots } from "./boots";

describe("isBootItem", () => {
  it("detects boots by id and name", () => {
    expect(isBootItem({ id: 3158, name: "명석함의 아이오니아 장화" })).toBe(true);
    expect(isBootItem({ name: "마법사의 신발" })).toBe(true);
    expect(isBootItem({ name: "헤르메스의 발걸음" })).toBe(true);
    expect(isBootItem({ name: "발걸음 분쇄기" })).toBe(false);
    expect(isBootItem({ id: 3078, name: "삼위일체" })).toBe(false);
  });
});

describe("withoutBoots", () => {
  it("drops boot slots and keeps the rest", () => {
    expect(
      withoutBoots([
        { name: "삼위일체" },
        { name: "명석함의 아이오니아 장화" },
        { name: "마나무네" },
      ]).map((item) => item.name),
    ).toEqual(["삼위일체", "마나무네"]);
  });
});
