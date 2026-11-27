import { describe, expect, it } from "vitest";
import { patchNotesLabel } from "./patch-notes";

describe("patchNotesLabel", () => {
  it("shows the public League patch number for a client build", () => {
    expect(patchNotesLabel("16.23")).toBe("26.23");
    expect(patchNotesLabel("15.1")).toBe("25.1");
  });

  it("leaves a notes-style or unknown patch alone", () => {
    expect(patchNotesLabel("26.23")).toBe("26.23");
    expect(patchNotesLabel("14.24")).toBe("14.24");
    expect(patchNotesLabel("unknown")).toBe("unknown");
    expect(patchNotesLabel("")).toBe("");
  });
});
