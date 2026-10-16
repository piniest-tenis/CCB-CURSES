import { describe, it, expect } from "vitest";
import {
  detectUsageFrequency,
  usageKeyForCard,
  usageKeyForGrimoireAbility,
  usageKeyForClassFeature,
  usageKeyForSubclassFeature,
  usageKeyForHopeFeature,
} from "../usageUtils";

describe("detectUsageFrequency", () => {
  it("detects once-per-long-rest (specific form)", () => {
    expect(detectUsageFrequency("Once per long rest, you may...")).toBe(
      "once-per-long-rest",
    );
  });

  it("detects once-per-short-rest (specific form)", () => {
    expect(detectUsageFrequency("Twice per short rest you can...")).toBe(
      "once-per-short-rest",
    );
  });

  it("detects generic long rest via 'per long rest'", () => {
    expect(detectUsageFrequency("You can do this once per long rest.")).toBe(
      "once-per-long-rest",
    );
  });

  it("detects generic short rest via 'per short rest'", () => {
    expect(detectUsageFrequency("Recover something per short rest.")).toBe(
      "once-per-short-rest",
    );
  });

  it("detects once-per-rest", () => {
    expect(detectUsageFrequency("Once per rest, regain focus.")).toBe(
      "once-per-rest",
    );
  });

  it("detects once-per-scene", () => {
    expect(detectUsageFrequency("Once per scene, you may inspire.")).toBe(
      "once-per-scene",
    );
  });

  it("detects once-per-session", () => {
    expect(detectUsageFrequency("Once per session, call a favor.")).toBe(
      "once-per-session",
    );
  });

  it("returns 'none' when no cadence phrase is present", () => {
    expect(detectUsageFrequency("A passive benefit with no cadence.")).toBe(
      "none",
    );
  });

  it("prioritises long rest over generic rest", () => {
    expect(
      detectUsageFrequency("Once per long rest, you may rest and recover."),
    ).toBe("once-per-long-rest");
  });

  it("is case-insensitive", () => {
    expect(detectUsageFrequency("ONCE PER REST")).toBe("once-per-rest");
  });

  it("handles empty string", () => {
    expect(detectUsageFrequency("")).toBe("none");
  });
});

describe("usage key helpers", () => {
  it("usageKeyForCard returns the cardId unchanged", () => {
    expect(usageKeyForCard("Valiance/aura-of-bravery")).toBe(
      "Valiance/aura-of-bravery",
    );
  });

  it("usageKeyForGrimoireAbility appends a grimoire index", () => {
    expect(usageKeyForGrimoireAbility("Valiance/grimoire-card", 2)).toBe(
      "Valiance/grimoire-card#grimoire:2",
    );
  });

  it("usageKeyForClassFeature namespaces by class and feature", () => {
    expect(usageKeyForClassFeature("devout", "Inspiration")).toBe(
      "class:devout:Inspiration",
    );
  });

  it("usageKeyForSubclassFeature namespaces by subclass and feature", () => {
    expect(usageKeyForSubclassFeature("true-believer", "Foundation")).toBe(
      "subclass:true-believer:Foundation",
    );
  });

  it("usageKeyForHopeFeature namespaces by class", () => {
    expect(usageKeyForHopeFeature("devout")).toBe("hope:devout");
  });
});
