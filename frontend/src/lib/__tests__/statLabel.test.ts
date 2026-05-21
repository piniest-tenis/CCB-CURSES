import { describe, it, expect } from "vitest";
import { statLabel } from "../tokenUtils";

describe("statLabel", () => {
  it("maps presence to Presence", () => {
    expect(statLabel("presence")).toBe("Presence");
  });

  it("maps spellcast to Spellcast", () => {
    expect(statLabel("spellcast")).toBe("Spellcast");
  });

  it("maps level to Level", () => {
    expect(statLabel("level")).toBe("Level");
  });

  it("maps tier to Tier", () => {
    expect(statLabel("tier")).toBe("Tier");
  });

  it("returns null for null", () => {
    expect(statLabel(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(statLabel(undefined)).toBeNull();
  });
});
