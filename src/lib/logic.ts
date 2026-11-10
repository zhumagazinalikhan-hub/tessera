import type { Checkin, DB, Habit, Level, Quadrant, Task } from '../data/types';
import { addDays, daysBetween, fromISO, today, toISO, weekDays } from './dates';

// ---------- Habits ----------

/**
 * Streak = days in a row with any check-in (Min counts).
 * Today does not break it until the day is over, and one missed day
 * per 7 days is forgiven, as the method promises.
 */
export function streak(checkins: Checkin[], habitId?: string, on = today()): number {
  const days = new Set(checkins.filter((c) => !habitId || c.habit_id === habitId).map((c) => c.date));
  let count = 0;
  let lastGap: string | null = null;
  for (let d = on, i = 0; i < 3650; i++, d = addDays(d, -1)) {
    if (days.has(d)) {
      count++;
      continue;
    }
    if (d === on) continue;
    if (lastGap === null || daysBetween(d, lastGap) >= 7) {
      if (!days.has(addDays(d, -1))) break; // two misses in a row end it
      lastGap = d;
      continue;
    }
    break;
  }
  return count;
}

export function levelOn(checkins: Checkin[], habitId: string, date: string): Level | null {
  return checkins.find((c) => c.habit_id === habitId && c.date === date)?.level ?? null;
}

export function labelFor(h: Habit, lv: Level): string {
  return lv === 'min' ? h.min_label : lv === 'max' ? h.max_label : h.target_label;
}

/** The day's level as lived: the day log if set, else the most common habit level. */
export function lived(db: DB, date: string): Level | null {
  const log = db.dayLogs.find((d) => d.date === date);
  if (log && daysBetween(date, today()) > 0) return log.level;
  const levels = db.checkins.filter((c) => c.date === date).map((c) => c.level);
  if (!levels.length) return log?.level ?? null;
  const n = (l: Level) => levels.filter((x) => x === l).length;
  return (['target', 'max', 'min'] as Level[]).sort((a, b) => n(b) - n(a))[0];
}

/** True when every active habit was checked in (at any level) on that day. */
export function allHabitsDone(db: DB, date: string): boolean {
  const relevant = db.habits.filter((h) => {
    if (h.archived) return false;
    if (h.created_at.slice(0, 10) <= date) return true;
    return db.checkins.some((c) => c.habit_id === h.id && c.date <= date);
  });
  if (!relevant.length) return false;
  return relevant.every((h) => db.checkins.some((c) => c.habit_id === h.id && c.date === date));
}

export const ALL_DONE_COLOR = '#4DA3FF';

// ---------- Tasks ----------

export const openTasks = (db: DB) => db.tasks.filter((t) => t.status === 'open');

export function todayTasks(db: DB, date = today()): Task[] {
  return db.tasks
    .filter((t) => t.today_date === date && (t.status === 'open' || t.status === 'done'))
    .sort((a, b) => (a.today_order ?? 99) - (b.today_order ?? 99));
}

/** Tasks picked for an earlier day that were not finished. */
export function leftovers(db: DB, date = today()): Task[] {
  return db.tasks.filter((t) => t.status === 'open' && t.today_date !== null && t.today_date < date);
}

export function minutesForLevel(t: Task, lv: Level): number {
  if (lv === 'min') return Math.min(t.estimate_min, t.urgent && t.due_date === today() ? t.estimate_min : 30);
  return t.estimate_min;
}

export interface Load {
  capacityMin: number;
  committedMin: number;
  byQuadrant: Record<Quadrant, number>;
  perDay: { date: string; min: number }[];
  perDayCap: number;
}

export function weekLoad(db: DB, date = today()): Load {
  const capacityMin = Math.round(db.profile.weekly_capacity_h * 60);
  const days = weekDays(date, 5);
  const byQuadrant: Record<Quadrant, number> = { do: 0, schedule: 0, delegate: 0, drop: 0 };
  const perDay = days.map((d) => ({ date: d, min: 0 }));
  let committed = 0;
  for (const t of openTasks(db)) {
    const q: Quadrant = t.urgent && t.important ? 'do' : t.important ? 'schedule' : t.urgent ? 'delegate' : 'drop';
    byQuadrant[q] += t.estimate_min;
    if (q !== 'drop') committed += t.estimate_min;
    const day = t.today_date && days.includes(t.today_date) ? t.today_date : t.due_date && days.includes(t.due_date) ? t.due_date : null;
    const slot = perDay.find((p) => p.date === day);
    if (slot && q !== 'drop') slot.min += t.estimate_min;
  }
  // Unscheduled committed work spreads over the days left this week.
  const placed = perDay.reduce((a, p) => a + p.min, 0);
  const rest = committed - placed;
  const left = perDay.filter((p) => p.date >= date);
  if (rest > 0 && left.length) left.forEach((p) => (p.min += Math.round(rest / left.length)));
  return { capacityMin, committedMin: committed, byQuadrant, perDay, perDayCap: Math.round(capacityMin / 5) };
}

export interface Move {
  task: Task;
  action: 'delegate' | 'later' | 'drop';
  saves: number;
}

/** Suggested moves that bring the week back under capacity, cheapest first. */
export function rebalance(db: DB): Move[] {
  const load = weekLoad(db);
  let over = load.committedMin - load.capacityMin;
  const end = addDays(weekDays(today(), 7)[0], 6);
  const out: Move[] = [];
  const cands: Move[] = [
    ...openTasks(db).filter((t) => t.urgent && !t.important).map((t) => ({ task: t, action: 'delegate' as const, saves: t.estimate_min })),
    ...openTasks(db)
      .filter((t) => t.important && !t.urgent && (!t.due_date || t.due_date > end))
      .map((t) => ({ task: t, action: 'later' as const, saves: t.estimate_min })),
  ];
  for (const m of cands) {
    if (over <= 0) break;
    out.push(m);
    over -= m.saves;
  }
  const drops = openTasks(db).filter((t) => !t.urgent && !t.important);
  return [...out, ...drops.map((t) => ({ task: t, action: 'drop' as const, saves: t.estimate_min }))];
}

// ---------- Smart sort for the brain dump ----------

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function dueFrom(text: string): string | null {
  const s = text.toLowerCase();
  const t0 = today();
  if (/\b(today|tonight|asap|eod)\b/.test(s)) return t0;
  if (/\btomorrow\b/.test(s)) return addDays(t0, 1);
  for (let i = 0; i < 7; i++) {
    const name = WEEKDAYS[i];
    if (new RegExp(`\\b(${name}|${name.slice(0, 3)})\\b`).test(s)) {
      const cur = fromISO(t0).getDay();
      return addDays(t0, ((i - cur + 7) % 7) || 7);
    }
  }
  const m = s.match(/\b(\d{1,2})[./](\d{1,2})\b/);
  if (m) {
    const d = new Date(fromISO(t0).getFullYear(), Number(m[2]) - 1, Number(m[1]));
    if (!isNaN(d.getTime())) return toISO(d);
  }
  return null;
}

function estimateFrom(text: string): number | null {
  const s = text.toLowerCase();
  const h = s.match(/(\d+(?:[.,]\d+)?)\s*(h|hr|hrs|hours?)\b/);
  if (h) return Math.round(parseFloat(h[1].replace(',', '.')) * 60);
  const m = s.match(/(\d+)\s*(m|min|mins|minutes?)\b/);
  if (m) return Number(m[1]);
  return null;
}

const IMPORTANT = /\b(report|client|contract|plan|strategy|demo|review|proposal|budget|launch|pitch|exam|study|health|doctor|tax|deadline|presentation|hire|interview|write|design|build)\b/;
const ROUTINE = /\b(email|emails|reply|answer|invoice|invoices|expense|expenses|chase|call|book|schedule|order|pay|follow[- ]?up|forms?|admin|errand)\b/;
const NOISE = /\b(news|feed|feeds|unsubscribe|cleanup|clean up|old|someday|maybe|tidy|scroll|organi[sz]e folders?)\b/;
const URGENT = /(!!|\b(urgent|asap|today|tonight|tomorrow|by|before|deadline|due|overdue)\b)/;

export interface Parsed {
  title: string;
  urgent: boolean;
  important: boolean;
  kind: 'deep' | 'routine';
  estimate_min: number;
  due_date: string | null;
}

export function smartSort(raw: string): Parsed[] {
  const parts = raw
    .split(/\n|·|;|•/)
    .map((s) => s.replace(/^\s*[-*\d.)]+\s*/, '').trim())
    .filter((s) => s.length > 1);
  const t0 = today();
  return parts.map((p) => {
    const s = p.toLowerCase();
    const due = dueFrom(p);
    const soon = due !== null && daysBetween(t0, due) <= 3;
    const noise = NOISE.test(s);
    const routine = ROUTINE.test(s);
    const important = !noise && (IMPORTANT.test(s) || (!routine && soon));
    // Admin with no deadline is still 'urgent' for someone: it goes to Delegate.
    const urgent = !noise && (URGENT.test(s) || soon || (routine && !important)) && (due === null || daysBetween(t0, due) <= 3);
    const kind: 'deep' | 'routine' = routine || noise ? 'routine' : 'deep';
    const est = estimateFrom(p) ?? (noise ? 30 : routine ? 45 : important ? 120 : 60);
    const title = p
      .replace(/!+/g, '')
      .replace(/\(?\b\d+(?:[.,]\d+)?\s*(h|hr|hrs|hours?|m|min|mins|minutes?)\b\)?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return { title: title.charAt(0).toUpperCase() + title.slice(1), urgent, important, kind, estimate_min: est, due_date: due };
  });
}

// ---------- Morning ----------

export const DAILY_LINES = [
  'Start with Min. The rest will follow.',
  'Done beats perfect today.',
  'Two minutes still count.',
  'Three things. The rest can wait.',
  'Protect the morning. It is your best work.',
  'A rough day is not a broken habit.',
  'Leave room. Margin is part of the plan.',
];

export function lineOfDay(date = today()): { text: string; index: number } {
  const index = Math.floor(fromISO(date).getTime() / 86400000) % DAILY_LINES.length;
  return { text: DAILY_LINES[index], index };
}
