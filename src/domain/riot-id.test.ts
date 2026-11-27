import { describe, expect, it } from "vitest";
import { parseRiotId, riotIdKey, riotIdLabel } from "./riot-id";

describe("riot id", () => {
  it("splits the last hash into name and tag", () => {
    expect(parseRiotId("  강아지#201  ")).toEqual({ gameName: "강아지", tagLine: "201" });
    expect(parseRiotId("foo#bar#KR1")).toEqual({ gameName: "foo#bar", tagLine: "KR1" });
    expect(riotIdLabel({ gameName: "Lzg", tagLine: "KR2" })).toBe("Lzg#KR2");
    expect(riotIdKey({ gameName: "Lzg", tagLine: "KR2" })).toBe("lzg#kr2");
  });

  it("rejects values that are not name#tag", () => {
    for (const raw of ["", "Lzg", "#KR1", "Lzg#", "   #KR1"]) {
      expect(() => parseRiotId(raw)).toThrow("닉네임#태그");
    }
  });
});
