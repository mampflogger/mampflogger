import { describe, expect, it } from "vitest";
import {
  mergeGermanSpokenNumberTranscript,
  parseGermanSpokenNumber,
  shouldDeferGermanSpokenNumber,
} from "@/lib/spokenNumbers";

describe("German spoken numbers", () => {
  it("parses whole hundreds correctly", () => {
    expect(parseGermanSpokenNumber("hundert")).toBe(100);
    expect(parseGermanSpokenNumber("einhundert")).toBe(100);
    expect(parseGermanSpokenNumber("sechshundert")).toBe(600);
    expect(parseGermanSpokenNumber("sechs hundert Gramm")).toBe(600);
  });

  it("defers only single digits that can become hundreds or thousands", () => {
    expect(shouldDeferGermanSpokenNumber("sechs", 6)).toBe(true);
    expect(shouldDeferGermanSpokenNumber("6", 6)).toBe(true);
    expect(shouldDeferGermanSpokenNumber("hundert", 100)).toBe(false);
    expect(shouldDeferGermanSpokenNumber("sechshundert", 600)).toBe(false);
  });

  it("merges split recognizer chunks into the intended number", () => {
    expect(parseGermanSpokenNumber(mergeGermanSpokenNumberTranscript("sechs", "hundert"))).toBe(600);
    expect(parseGermanSpokenNumber(mergeGermanSpokenNumberTranscript("ein", "hundert"))).toBe(100);
  });
});