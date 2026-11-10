import { addDays, today } from '../lib/dates';
import type { Checkin, DayLog, Habit, Level, Task } from './types';

const uid = () => crypto.randomUUID();

/** A realistic starting week, so every screen has something to show. */
export function sampleData(userId: string) {
  const t0 = today();
  const now = new Date().toISOString();
  const task = (p: Partial<Task> & Pick<Task, 'title'>): Task => ({
    id: uid(),
    user_id: userId,
    urgent: false,
    important: false,
    kind: 'deep',
    estimate_min: 60,
    due_date: null,
    status: 'open',
    delegated_to: null,
    today_date: null,
    today_order: null,
    min_note: null,
    done_level: null,
    done_at: null,
    created_at: now,
    ...p,
  });
  const tasks: Task[] = [
    task({ title: 'Q4 report to finance', urgent: true, important: true, estimate_min: 180, due_date: t0, today_date: t0, today_order: 0, min_note: 'Section 1 drafted' }),
    task({ title: 'Contract review', urgent: true, important: true, estimate_min: 120, due_date: addDays(t0, 1), today_date: t0, today_order: 1, min_note: 'Read 2 sections' }),
    task({ title: 'Client demo outline', urgent: true, important: true, estimate_min: 60, due_date: addDays(t0, 3), today_date: t0, today_order: 2, min_note: '3 bullet points' }),
    task({ title: 'Build client demo', urgent: true, important: true, estimate_min: 420, due_date: addDays(t0, 3) }),
    task({ title: 'Plan Q1 priorities', important: true, estimate_min: 240 }),
    task({ title: 'Rewrite onboarding doc', important: true, estimate_min: 240 }),
    task({ title: 'Budget model', important: true, estimate_min: 180, due_date: addDays(t0, 6) }),
    task({ title: 'Answer vendor emails', urgent: true, kind: 'routine', estimate_min: 180 }),
    task({ title: 'Chase invoices', urgent: true, kind: 'routine', estimate_min: 120 }),
    task({ title: 'Expense reports', urgent: true, kind: 'routine', estimate_min: 120 }),
    task({ title: 'Clean up old folders', kind: 'routine', estimate_min: 120 }),
    task({ title: 'Unsubscribe from news feeds', kind: 'routine', estimate_min: 60 }),
    task({ title: 'Book dentist', status: 'done', kind: 'routine', estimate_min: 15, done_level: 'target', done_at: now, urgent: true }),
  ];
  const habit = (name: string, cue: string, a: string, b: string, c: string, remind: string): Habit => ({
    id: uid(), user_id: userId, name, cue, remind_at: remind, min_label: a, target_label: b, max_label: c, archived: false, created_at: now,
  });
  const habits = [
    habit('Learn English', 'After I make my coffee', '5 cards · 3 min', '15 cards · 20 min', '40 cards · 45 min', '07:30'),
    habit('Read', 'After dinner', '2 pages · 3 min', '10 pages · 15 min', '1 chapter · 40 min', '21:00'),
    habit('Move', 'After work', '5 min stretch', '20 min walk', '45 min run', '18:30'),
  ];
  const pattern: (Level | null)[][] = [
    ['target', 'target', 'min', 'target', 'max', 'target', 'target', 'min', 'target', 'target', 'max', 'target', 'target', 'target'],
    ['target', 'min', 'target', 'min', 'target', 'target', 'min', 'target', 'target', 'min', 'target', 'min', 'min', 'min'],
    ['min', 'target', null, 'target', 'min', 'target', 'min', 'target', 'min', null, 'min', 'target', 'min', 'target'],
  ];
  const checkins: Checkin[] = [];
  habits.forEach((h, i) =>
    pattern[i].forEach((lv, j) => {
      if (lv) checkins.push({ id: uid(), user_id: userId, habit_id: h.id, date: addDays(t0, j - 14), level: lv, note: null });
    }),
  );
  const dayLevels: Level[] = ['target', 'target', 'min', 'target', 'max', 'target', 'target', 'min', 'target', 'target', 'max', 'target', 'target', 'target'];
  const dayLogs: DayLog[] = dayLevels.map((lv, j) => ({ id: uid(), user_id: userId, date: addDays(t0, j - 14), energy: null, level: lv }));
  return { tasks, habits, checkins, dayLogs };
}
