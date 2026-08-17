import type { AppState, Readiness, ReadinessCheckIn, RecoveryReason } from "@/lib/startHereModels";

export const RECOVERY_REASON_LABELS: Record<RecoveryReason, string> = {
  "poor-sleep": "Poor sleep",
  sore: "Sore",
  stressed: "Stress",
  "short-on-time": "Short on time",
  "feeling-good": "Feeling good",
};

export interface RecoveryTextSignal {
  reasons: RecoveryReason[];
  inferredReadiness: Readiness | null;
}

export interface RecoveryTextPatch {
  patch: Partial<AppState>;
  summary: string;
  signal: RecoveryTextSignal;
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function parseSleepHours(text: string) {
  const match = text.match(/(?:slept|sleep(?:ing)? for)\s+(?:about\s+|around\s+|only\s+)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i);
  if (!match) return null;
  const hours = Number(match[1]);
  return Number.isFinite(hours) ? hours : null;
}

export function detectRecoverySignals(raw: string): RecoveryTextSignal {
  const text = raw.toLowerCase().replace(/[’]/g, "'");
  const reasons: RecoveryReason[] = [];
  const sleepHours = parseSleepHours(text);

  if (
    (sleepHours !== null && sleepHours <= 6) ||
    /\b(poor sleep|bad sleep|rough night|barely slept|hardly slept|didn't sleep|did not sleep|up all night|sleep was (?:bad|terrible|awful)|sleep sucked)\b/.test(text)
  ) reasons.push("poor-sleep");

  if (/\b(sore|soreness|doms|muscles? (?:feel )?stiff|beat up)\b/.test(text)) reasons.push("sore");
  if (/\b(stressed|stressful|overwhelmed|mentally drained|rough day|crazy day)\b/.test(text)) reasons.push("stressed");
  if (
    /\b(short on time|time crunch|rushed|busy today|packed day|don't have much time|do not have much time)\b/.test(text) ||
    /\b(?:only|just) (?:have|got) \d{1,3}\s*(?:minutes?|mins?)\b/.test(text)
  ) reasons.push("short-on-time");
  if (/\b(feel(?:ing)? great|well rested|good energy|lots of energy|plenty of energy|ready to go|feel(?:ing)? strong)\b/.test(text)) reasons.push("feeling-good");

  const negative = reasons.filter((reason) => reason !== "feeling-good");
  const explicitlyLow =
    (sleepHours !== null && sleepHours <= 5.5) ||
    /\b(exhausted|wiped out|wrecked|running on fumes|no energy|very sore|really sore|extremely sore|very stressed|really stressed|completely overwhelmed)\b/.test(text) ||
    negative.length >= 2;
  const explicitlyHigh = reasons.includes("feeling-good") && negative.length === 0;

  return {
    reasons: unique(reasons),
    inferredReadiness: explicitlyLow ? "low" : explicitlyHigh ? "high" : null,
  };
}

export function mergeRecoverySignalFromText(state: AppState, raw: string, date: string): RecoveryTextPatch | null {
  const signal = detectRecoverySignals(raw);
  if (!signal.reasons.length && signal.inferredReadiness === null) return null;

  const existing = [...state.readinessCheckIns].reverse().find((item) => item.date === date);
  const readiness = signal.inferredReadiness ?? existing?.readiness ?? "normal";
  const reasons = unique([...(existing?.reasons ?? []), ...signal.reasons]);
  const next: ReadinessCheckIn = { date, readiness, reasons, source: "coach" };
  const readinessCheckIns = [...state.readinessCheckIns.filter((item) => item.date !== date), next];
  const labels = signal.reasons.map((reason) => RECOVERY_REASON_LABELS[reason].toLowerCase());
  const summary = labels.length
    ? `Noted for today: ${labels.join(", ")}.`
    : `Noted today's readiness as ${readiness}.`;
  return { patch: { readinessCheckIns }, summary, signal };
}

export function recoveryReasonsToday(state: AppState, today: string): RecoveryReason[] {
  return [...state.readinessCheckIns].reverse().find((item) => item.date === today)?.reasons ?? [];
}

export function recoveryReasonRate(
  state: AppState,
  today: string,
  reason: RecoveryReason,
  windowDays = 14,
): number | null {
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - (windowDays - 1));
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  const checkIns = state.readinessCheckIns.filter((item) => item.date >= cutoffKey && item.date <= today);
  if (checkIns.length < 5) return null;
  return checkIns.filter((item) => (item.reasons ?? []).includes(reason)).length / checkIns.length;
}

export function recoveryPatternSummary(state: AppState, today: string, windowDays = 14): string[] {
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - (windowDays - 1));
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  const checkIns = state.readinessCheckIns.filter((item) => item.date >= cutoffKey && item.date <= today);
  if (checkIns.length < 4) return [];

  const summaries: string[] = [];
  for (const reason of ["poor-sleep", "sore", "stressed", "short-on-time", "feeling-good"] as RecoveryReason[]) {
    const count = checkIns.filter((item) => (item.reasons ?? []).includes(reason)).length;
    if (count >= 2) summaries.push(`${RECOVERY_REASON_LABELS[reason]}: ${count} of ${checkIns.length} recent check-ins.`);
  }
  return summaries;
}

export function progressionRecoveryHold(state: AppState, today: string): string | null {
  const checkIn = [...state.readinessCheckIns].reverse().find((item) => item.date === today);
  if (!checkIn) return null;
  const reasons = checkIn.reasons ?? [];
  const limiting = reasons.filter((reason) => ["poor-sleep", "sore", "stressed"].includes(reason));
  if (checkIn.readiness !== "low" && !limiting.length) return null;
  if (limiting.includes("poor-sleep")) return "Recovery is off today because sleep was rough";
  if (limiting.includes("sore")) return "You flagged soreness today";
  if (limiting.includes("stressed")) return "You flagged a high-stress day";
  return "Readiness is low today";
}
