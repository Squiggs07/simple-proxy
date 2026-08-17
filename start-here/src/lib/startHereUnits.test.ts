import { describe, expect, it } from "vitest";
import {
  cmToFeetInches,
  displayLoad,
  displayWeight,
  feetInchesToCm,
  inputWeightToKg,
  kgToInputWeight,
  kgToLb,
  lbToKg,
} from "@/lib/startHereUnits";

describe("Start Here units", () => {
  it("round-trips pounds and kilograms closely", () => {
    const kg = 82;
    expect(lbToKg(kgToLb(kg))).toBeCloseTo(kg, 6);
  });

  it("round-trips common height values", () => {
    const height = feetInchesToCm(5, 10);
    expect(cmToFeetInches(height)).toEqual({ feet: 5, inches: 10 });
  });

  it("keeps stored workout load in kilograms while displaying pounds when selected", () => {
    const storedKg = inputWeightToKg(160, "imperial");
    expect(kgToInputWeight(storedKg, "imperial")).toBeCloseTo(160, 6);
    expect(displayLoad(storedKg, "imperial")).toBe("160 lb");
  });

  it("formats body weight in the selected system", () => {
    expect(displayWeight(82, "metric")).toBe("82.0 kg");
    expect(displayWeight(82, "imperial")).toBe("180.8 lb");
  });
});
