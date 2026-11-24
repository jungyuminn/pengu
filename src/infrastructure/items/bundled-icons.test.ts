import { describe, expect, it } from "vitest";
import { bundledItemIconUrl, itemIconLookup } from "./bundled-icons";

describe("bundledItemIconUrl", () => {
  it("points at the packaged item png", () => {
    expect(bundledItemIconUrl("heartsteel.png")).toBe("../../../assets/items/heartsteel.png");
  });
});

describe("itemIconLookup", () => {
  it("indexes by id and names", () => {
    const map = itemIconLookup([{ id: 3084, file: "heartsteel.png", names: ["강철심장", "Heartsteel", "心之钢"] }]);
    expect(map.get("3084")).toBe("../../../assets/items/heartsteel.png");
    expect(map.get("강철심장")).toBe("../../../assets/items/heartsteel.png");
    expect(map.get("heartsteel")).toBe("../../../assets/items/heartsteel.png");
  });
});
