export type Level = 'min' | 'target' | 'max';
export type Energy = 'low' | 'normal' | 'high';
export type Quadrant = 'do' | 'schedule' | 'delegate' | 'drop';

export interface Profile {
  id: string;
  display_name: string;
  weekly_capacity_h: number;
  work_start: string;
  work_end: string;
  focus_window: 'morning' | 'afternoon';
  default_level: Level;
  theme: 'light' | 'dark' | 'auto';
  onboarded: boolean;
  show_ayah: boolean;
  ayah_lang: 'en' | 'ru';
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  urgent: boolean;
  important: boolean;
  kind: 'deep' | 'routine';
  estimate_min: number;
  due_date: string | null;
  status: 'open' | 'done' | 'dropped' | 'delegated';
  delegated_to: string | null;
  today_date: string | null;
  today_order: number | null;
  min_note: string | null;
  done_level: Level | null;
  done_at: string | null;
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  cue: string;
  remind_at: string | null;
  min_label: string;
  target_label: string;
  max_label: string;
  archived: boolean;
  created_at: string;
}

export interface Checkin {
  id: string;
  user_id: string;
  habit_id: string;
  date: string;
  level: Level;
  note: string | null;
}

export interface DayLog {
  id: string;
  user_id: string;
  date: string;
  energy: Energy | null;
  level: Level;
}

export interface FocusSession {
  id: string;
  user_id: string;
  task_id: string | null;
  started_at: string;
  planned_min: number;
  actual_min: number;
  level: Level | null;
}

export interface Review {
  id: string;
  user_id: string;
  week_start: string;
  slipped_reason: string | null;
  change_note: string | null;
}

export interface DB {
  profile: Profile;
  tasks: Task[];
  habits: Habit[];
  checkins: Checkin[];
  dayLogs: DayLog[];
  sessions: FocusSession[];
  reviews: Review[];
}

export type Table = 'tasks' | 'habits' | 'habit_checkins' | 'day_logs' | 'focus_sessions' | 'weekly_reviews';

export const LEVELS: Level[] = ['min', 'target', 'max'];
export const LEVEL_LABEL: Record<Level, string> = { min: 'Min', target: '100%', max: 'Max' };

export function quadrantOf(t: Pick<Task, 'urgent' | 'important'>): Quadrant {
  if (t.urgent && t.important) return 'do';
  if (t.important) return 'schedule';
  if (t.urgent) return 'delegate';
  return 'drop';
}

export const QUADRANTS: { id: Quadrant; title: string; sub: string; urgent: boolean; important: boolean }[] = [
  { id: 'do', title: 'Do first', sub: 'Urgent, important', urgent: true, important: true },
  { id: 'schedule', title: 'Schedule', sub: 'Important only', urgent: false, important: true },
  { id: 'delegate', title: 'Delegate', sub: 'Urgent only', urgent: true, important: false },
  { id: 'drop', title: 'Eliminate', sub: 'Neither', urgent: false, important: false },
];
