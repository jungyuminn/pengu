import { describe, expect, it } from "vitest";
import { asThemeMode, windowBackground } from "./theme";

describe("asThemeMode", () => {
  it("defaults to dark", () => {
    expect(asThemeMode(undefined)).toBe("dark");
    expect(asThemeMode("dark")).toBe("dark");
    expect(asThemeMode("light")).toBe("light");
  });
});

describe("windowBackground", () => {
  it("matches each theme", () => {
    expect(windowBackground("dark")).toBe("#10141c");
    expect(windowBackground("light")).toBe("#f4f6fa");
  });
});
