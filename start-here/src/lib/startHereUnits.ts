import type { UnitSystem } from "@/lib/startHereModels";

const LB_PER_KG = 2.2046226218;
const CM_PER_INCH = 2.54;

export function kgToLb(kg: number) {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number) {
  return lb / LB_PER_KG;
}

export function cmToFeetInches(cm: number) {
  const totalInches = cm / CM_PER_INCH;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches - feet * 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number) {
  return (feet * 12 + inches) * CM_PER_INCH;
}

export function displayWeight(kg: number, units: UnitSystem, digits = 1) {
  const value = units === "imperial" ? kgToLb(kg) : kg;
  return `${value.toFixed(digits)} ${units === "imperial" ? "lb" : "kg"}`;
}

export function displayWeightChange(kg: number, units: UnitSystem, digits = 1) {
  const value = units === "imperial" ? kgToLb(kg) : kg;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)} ${units === "imperial" ? "lb" : "kg"}`;
}

export function displayLoad(kg: number | null, units: UnitSystem) {
  if (kg === null) return "BW";
  const value = units === "imperial" ? kgToLb(kg) : kg;
  const rounded = Math.round(value * 2) / 2;
  return `${rounded} ${units === "imperial" ? "lb" : "kg"}`;
}

export function inputWeightToKg(value: number, units: UnitSystem) {
  return units === "imperial" ? lbToKg(value) : value;
}

export function kgToInputWeight(kg: number, units: UnitSystem) {
  return units === "imperial" ? kgToLb(kg) : kg;
}
