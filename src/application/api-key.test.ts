import { describe, expect, it } from "vitest";
import { resolveApiKey } from "./api-key";

describe("resolveApiKey", () => {
  it("prefers an override, otherwise uses the bundled key", () => {
    expect(resolveApiKey("  user-key  ", "built-in")).toBe("user-key");
    expect(resolveApiKey("", "built-in")).toBe("built-in");
    expect(resolveApiKey("   ", "")).toBe("");
  });
});
