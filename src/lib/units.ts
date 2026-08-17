/** Unit conversions between what users type and the metric values we store. */

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / 2.54);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function lbsToKg(lbs: number): number {
  return lbs * 0.45359237;
}

export function kgToLbs(kg: number): number {
  return kg / 0.45359237;
}
