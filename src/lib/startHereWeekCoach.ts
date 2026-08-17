import type { AppState, WeekTrainingException } from "@/lib/startHereModels";
import {
  WEEKDAYS,
  addCalendarDays,
  buildTrainingWeek,
  mondayOf,
  normalizePreferredDays,
  type Weekday,
} from "@/lib/startHereWeek";

export interface WeekCoachActionResult {
  patch: Partial<AppState>;
  reply: string;
  changeSummary?: string;
  clarification?: string;
}

const DAY_LOOKUP: Record<string, Weekday> = {
  mon: "Mon", monday: "Mon",
  tue: "Tue", tues: "Tue", tuesday: "Tue",
  wed: "Wed", weds: "Wed", wednesday: "Wed",
  thu: "Thu", thur: "Thu", thurs: "Thu", thursday: "Thu",
  fri: "Fri", friday: "Fri",
  sat: "Sat", saturday: "Sat",
  sun: "Sun", sunday: "Sun",
};

interface DayMention {
  day: Weekday;
  index: number;
  raw: string;
}

function dayMentions(text: string): DayMention[] {
  const mentions: DayMention[] = [];
  const regex = /\b(mon(?:day)?|tue(?:s|sday)?|wed(?:s|nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/gi;
  for (const match of text.matchAll(regex)) {
    const raw = match[0].toLowerCase();
    const day = DAY_LOOKUP[raw];
    if (day) mentions.push({ day, index: match.index ?? 0, raw });
  }
  return mentions;
}

function dateForWeekday(day: Weekday, today: string) {
  return addCalendarDays(mondayOf(today), WEEKDAYS.indexOf(day));
}

function labelDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`));
}

function scopeIsPermanent(text: string) {
  return /from now on|going forward|every week|each week|ongoing|permanent|normally|my normal schedule/.test(text);
}

function trainingScheduleContext(text: string) {
  return /train|training|workout|session|gym/.test(text);
}

function targetFirstInsteadOf(text: string, mentions: DayMention[]) {
  if (mentions.length < 2 || !/instead of/.test(text)) return null;
  const insteadIndex = text.indexOf("instead of");
  const before = mentions.filter((item) => item.index < insteadIndex).at(-1);
  const after = mentions.find((item) => item.index > insteadIndex);
  if (!before || !after) return null;
  return { source: after.day, target: before.day };
}

function weekdayPair(text: string, mentions: DayMention[]) {
  const insteadPair = targetFirstInsteadOf(text, mentions);
  if (insteadPair) return insteadPair;
  if (mentions.length >= 2) return { source: mentions[0].day, target: mentions[1].day };
  return null;
}

function resolveSourceDate(text: string, today: string, mentions: DayMention[]) {
  if (/\btoday(?:'s)?\b/.test(text) || /\btonight\b/.test(text)) return today;
  if (/\btomorrow(?:'s)?\s+(?:workout|session|training)\b/.test(text)) return addCalendarDays(today, 1);
  const pair = weekdayPair(text, mentions);
  if (pair) return dateForWeekday(pair.source, today);
  if (mentions[0]) return dateForWeekday(mentions[0].day, today);
  return null;
}

function resolveTargetDate(text: string, today: string, mentions: DayMention[]) {
  if (/\b(?:to|until|on)\s+tomorrow\b/.test(text) || /\btomorrow\s+instead\b/.test(text)) return addCalendarDays(today, 1);
  const pair = weekdayPair(text, mentions);
  if (pair) return dateForWeekday(pair.target, today);
  const toDay = text.match(/\bto\s+(mon(?:day)?|tue(?:s|sday)?|wed(?:s|nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i);
  if (toDay) return dateForWeekday(DAY_LOOKUP[toDay[1].toLowerCase()], today);
  return null;
}

function withReplacementException(state: AppState, exception: WeekTrainingException) {
  const cutoff = addCalendarDays(exception.weekStart, -56);
  return [
    ...state.weekTrainingExceptions.filter((item) => item.weekStart >= cutoff && !(item.weekStart === exception.weekStart && item.fromDate === exception.fromDate)),
    exception,
  ];
}

function normalWeekdaysChange(text: string, state: AppState, today: string, mentions: DayMention[]): WeekCoachActionResult | null {
  if (!scopeIsPermanent(text) || !trainingScheduleContext(text)) return null;
  const pair = weekdayPair(text, mentions);
  if (!pair) return null;
  const preferred = normalizePreferredDays(state.preferredDays, state.trainingDays);
  if (!preferred.includes(pair.source)) {
    return {
      patch: {},
      reply: `${pair.source} is not one of your normal training days right now, so I did not change the ongoing schedule. Your current rhythm is ${preferred.join(" / ")}.`,
      clarification: "schedule-source",
    };
  }
  if (preferred.includes(pair.target) && pair.target !== pair.source) {
    return {
      patch: {},
      reply: `${pair.target} already has a normal workout. Pick a different replacement day so I do not stack two planned sessions together.`,
      clarification: "schedule-conflict",
    };
  }
  const next = preferred
    .map((day) => day === pair.source ? pair.target : day)
    .sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
  return {
    patch: {
      preferredDays: next,
      weekTrainingExceptions: state.weekTrainingExceptions.filter((item) => item.weekStart !== mondayOf(today)),
    },
    reply: `Done. ${pair.target} replaces ${pair.source} in your normal weekly schedule going forward. I cleared this week’s temporary schedule edits so the ongoing plan stays unambiguous.`,
    changeSummary: `Ongoing schedule · ${preferred.join(" / ")} → ${next.join(" / ")}`,
  };
}

export function interpretWeekScheduleRequest(raw: string, state: AppState): WeekCoachActionResult | null {
  const text = raw.trim().toLowerCase().replace(/[’]/g, "'");
  const restoreIntent = /restore (?:my )?(?:normal )?schedule(?: this week)?|clear (?:my )?(?:week|weekly) (?:changes|adjustments)|undo (?:my )?(?:week|weekly) schedule/.test(text);
  if (!text || (!trainingScheduleContext(text) && !restoreIntent)) return null;
  const today = state.currentDay || new Date().toISOString().slice(0, 10);
  const weekStart = mondayOf(today);
  const week = buildTrainingWeek(state, today);
  const mentions = dayMentions(text);

  const ongoing = normalWeekdaysChange(text, state, today, mentions);
  if (ongoing) return ongoing;
  if (scopeIsPermanent(text) && !restoreIntent) return null;

  if (/restore (?:my )?(?:normal )?schedule(?: this week)?|clear (?:my )?(?:week|weekly) (?:changes|adjustments)|undo (?:my )?(?:week|weekly) schedule/.test(text)) {
    if (!week.activeExceptions.length) {
      return { patch: {}, reply: "This week is already using your normal schedule. There is no temporary training-day change to clear." };
    }
    return {
      patch: { weekTrainingExceptions: state.weekTrainingExceptions.filter((item) => item.weekStart !== weekStart) },
      reply: `Done. This week is back to your normal ${week.preferredDays.join(" / ")} training rhythm.`,
      changeSummary: "This week → normal training schedule restored",
    };
  }

  const moveIntent = /move|reschedule|shift|push|instead/.test(text)
    || (/can't|cannot|won't|unable/.test(text) && mentions.length >= 2)
    || (/can't|cannot|won't|unable/.test(text) && /tomorrow/.test(text));
  const skipIntent = /skip|cancel/.test(text)
    || (/can't train|cannot train|can't make|cannot make|won't be able to train|unable to train/.test(text) && !moveIntent);
  if (!moveIntent && !skipIntent) return null;

  const sourceDate = resolveSourceDate(text, today, mentions);
  if (!sourceDate) {
    return {
      patch: {},
      reply: "I can change just this week, but I need to know which workout you mean — for example, ‘move Friday’s workout to Saturday.’",
      clarification: "schedule-source",
    };
  }
  if (sourceDate < week.start || sourceDate > week.end) {
    return {
      patch: {},
      reply: "That day falls outside the current Monday–Sunday plan. Tell me the day in this week you want to change.",
      clarification: "schedule-week",
    };
  }

  const sourceDay = week.days.find((day) => day.date === sourceDate);
  if (!sourceDay) return null;
  const originalFromDate = sourceDay.movedFromDate ?? sourceDate;
  const originalDay = week.days.find((day) => day.date === originalFromDate);
  if (!originalDay?.baseScheduled) {
    return {
      patch: {},
      reply: `${labelDate(sourceDate)} does not have one of your planned workouts this week. Your normal days are ${week.preferredDays.join(" / ")}.`,
      clarification: "schedule-source",
    };
  }
  if (sourceDay.trained) {
    return {
      patch: {},
      reply: `You already logged training on ${labelDate(sourceDate)}, so I left that completed session where it is.`,
      clarification: "schedule-complete",
    };
  }

  if (skipIntent && !moveIntent) {
    const exception: WeekTrainingException = {
      id: `week-skip-${originalFromDate}-${Date.now()}`,
      weekStart,
      kind: "skip",
      fromDate: originalFromDate,
      toDate: null,
      createdAt: new Date().toISOString(),
      note: "Week-only Coach change",
    };
    return {
      patch: { weekTrainingExceptions: withReplacementException(state, exception) },
      reply: `Done. I took ${labelDate(sourceDate)} out of this week only. Your normal ${week.preferredDays.join(" / ")} schedule is unchanged for future weeks.`,
      changeSummary: `This week only · ${labelDate(sourceDate)} excused`,
    };
  }

  const targetDate = resolveTargetDate(text, today, mentions);
  if (!targetDate) {
    return {
      patch: {},
      reply: `I found the ${labelDate(sourceDate)} workout, but I need the day you want to move it to.`,
      clarification: "schedule-target",
    };
  }
  if (targetDate < week.start || targetDate > week.end) {
    return {
      patch: {},
      reply: `${labelDate(targetDate)} is outside this week. I kept the current plan unchanged rather than turning a one-week move into a different week’s schedule.`,
      clarification: "schedule-week",
    };
  }
  if (targetDate === sourceDate) {
    return { patch: {}, reply: `That workout is already on ${labelDate(sourceDate)}.` };
  }

  if (targetDate === originalFromDate && sourceDay.adjustment === "moved-to") {
    return {
      patch: { weekTrainingExceptions: state.weekTrainingExceptions.filter((item) => !(item.weekStart === weekStart && item.fromDate === originalFromDate)) },
      reply: `Done. I put the workout back on ${labelDate(originalFromDate)} and removed the temporary move. Your normal schedule was never changed.`,
      changeSummary: `This week only · workout restored to ${labelDate(originalFromDate)}`,
    };
  }

  const targetDay = week.days.find((day) => day.date === targetDate);
  if (targetDay?.trained) {
    return {
      patch: {},
      reply: `You already logged training on ${labelDate(targetDate)}, so I did not stack another planned workout there.`,
      clarification: "schedule-conflict",
    };
  }
  const occupiedByOtherSession = targetDay?.scheduled && targetDate !== sourceDate;
  if (occupiedByOtherSession) {
    return {
      patch: {},
      reply: `${labelDate(targetDate)} already has ${targetDay.workoutName ?? "a planned workout"}. Pick a different day and I’ll move this one without stacking sessions.`,
      clarification: "schedule-conflict",
    };
  }

  const exception: WeekTrainingException = {
    id: `week-move-${originalFromDate}-${Date.now()}`,
    weekStart,
    kind: "move",
    fromDate: originalFromDate,
    toDate: targetDate,
    createdAt: new Date().toISOString(),
    note: "Week-only Coach change",
  };
  return {
    patch: { weekTrainingExceptions: withReplacementException(state, exception) },
    reply: `Done. I moved ${labelDate(sourceDate)}’s workout to ${labelDate(targetDate)} for this week only. The workout itself keeps its place in the A/B rotation, and your normal ${week.preferredDays.join(" / ")} schedule stays unchanged after Sunday.`,
    changeSummary: `This week only · ${labelDate(sourceDate)} → ${labelDate(targetDate)}`,
  };
}
