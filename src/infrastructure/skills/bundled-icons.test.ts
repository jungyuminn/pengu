import { describe, expect, it } from "vitest";
import { bundledSkillIconUrl, skillIconFileName, skillIconIndex } from "./bundled-icons";

describe("skillIconFileName", () => {
  it("uses lowercase champion key and skill", () => {
    expect(skillIconFileName("TahmKench", "Q")).toBe("tahmkench_q.png");
    expect(skillIconFileName("MissFortune", "W")).toBe("missfortune_w.png");
  });
});

describe("bundledSkillIconUrl", () => {
  it("points at the packaged skill png", () => {
    expect(bundledSkillIconUrl("Olaf", "Q")).toBe("../../../assets/skills/olaf_q.png");
  });
});

describe("skillIconIndex", () => {
  it("indexes bundled QWE paths", () => {
    const map = skillIconIndex("Olaf");
    expect(map.get("Q")).toBe("../../../assets/skills/olaf_q.png");
    expect(map.get("W")).toBe("../../../assets/skills/olaf_w.png");
    expect(map.get("E")).toBe("../../../assets/skills/olaf_e.png");
    expect(skillIconIndex("").size).toBe(0);
  });
});
