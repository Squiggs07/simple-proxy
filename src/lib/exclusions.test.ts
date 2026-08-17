import { describe, expect, it } from "vitest";

import { parseExclusions, serializeExclusions } from "./exclusions";

describe("exclusions storage", () => {
  it("round-trips items containing commas", () => {
    const items = ["Vegetarian", "olives, capers", "No dairy"];
    expect(parseExclusions(serializeExclusions(items))).toEqual(items);
  });

  it("trims and drops empty entries on serialize", () => {
    expect(parseExclusions(serializeExclusions([" No nuts ", "", "  "]))).toEqual([
      "No nuts",
    ]);
  });

  it("parses the legacy comma-separated format", () => {
    expect(parseExclusions("Vegetarian,No dairy")).toEqual([
      "Vegetarian",
      "No dairy",
    ]);
  });

  it("returns an empty list for empty storage", () => {
    expect(parseExclusions("")).toEqual([]);
  });
});
