import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { emptyDB, type AuthUser, type Change } from './adapters';
import { backend } from './backend';
import { sampleData } from './sample';
import type { Checkin, DayLog, DB, Energy, FocusSession, Habit, Level, Profile, Review, Table, Task } from './types';

const DEMO_USER = '00000000-0000-4000-8000-000000000001';
const uid = () => crypto.randomUUID();

type Status = 'loading' | 'signed-out' | 'ready' | 'error';

export interface Store {
  status: Status;
  error: string | null;
  mode: 'demo' | 'firebase' | 'supabase';
  email: string | null;
  db: DB;
  toast: string | null;
  showToast(msg: string): void;
  // tasks
  addTask(p: Partial<Task> & Pick<Task, 'title'>): Task;
  addTasks(list: (Partial<Task> & Pick<Task, 'title'>)[]): void;
  updateTask(id: string, patch: Partial<Task>): void;
  deleteTask(id: string): void;
  // habits
  addHabit(p: Omit<Habit, 'id' | 'user_id' | 'archived' | 'created_at'>): Habit;
  updateHabit(id: string, patch: Partial<Habit>): void;
  deleteHabit(id: string): void;
  checkIn(habitId: string, date: string, level: Level | null, note?: string | null): void;
  // days
  setDay(date: string, patch: { level?: Level; energy?: Energy | null }): void;
  dayLevel(date: string): Level;
  addSession(s: Omit<FocusSession, 'id' | 'user_id'>): void;
  saveReview(weekStart: string, patch: Partial<Review>): void;
  updateProfile(patch: Partial<Profile>): void;
  loadSample(): void;
  resetAll(): Promise<void>;
  signOut(): Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

const TABLE_KEY: Record<Table, keyof Omit<DB, 'profile'>> = {
  tasks: 'tasks',
  habits: 'habits',
  habit_checkins: 'checkins',
  day_logs: 'dayLogs',
  focus_sessions: 'sessions',
  weekly_reviews: 'reviews',
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const adapter = backend.adapter;
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [db, setDb] = useState<DB>(() => emptyDB(DEMO_USER));
  const [toast, setToast] = useState<string | null>(null);
  const dbRef = useRef(db);
  useEffect(() => {
    dbRef.current = db;
  }, [db]);
  const userId = backend.auth ? user?.id ?? '' : DEMO_USER;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  }, []);

  // ---- boot ----
  useEffect(() => {
    if (!backend.auth) {
      adapter.load(DEMO_USER).then((d) => {
        setDb(d);
        setStatus('ready');
      });
      return;
    }
    return backend.auth.onChange((u) => {
      setUser((prev) => (prev?.id === u?.id ? prev : u));
      if (!u) {
        setStatus('signed-out');
        setDb(emptyDB(DEMO_USER));
      }
    });
  }, [adapter]);

  useEffect(() => {
    if (!backend.auth || !user) return;
    setStatus('loading');
    adapter
      .load(user.id)
      .then((d) => {
        setDb(d);
        setStatus('ready');
      })
      .catch((e: Error) => {
        setError(e.message);
        setStatus('error');
      });
  }, [user, adapter]);

  // ---- write path: update memory first, then persist ----
  const commit = useCallback(
    (next: DB, changes: Change[]) => {
      setDb(next);
      dbRef.current = next;
      (async () => {
        try {
          for (const c of changes) await adapter.persist(next, c);
        } catch (e) {
          showToast(`Not saved: ${(e as Error).message}`);
        }
      })();
    },
    [adapter, showToast],
  );

  const putRows = useCallback(
    <T extends { id: string }>(table: Table, rows: T[]) => {
      const key = TABLE_KEY[table];
      const cur = dbRef.current;
      const list = [...(cur[key] as unknown as T[])];
      for (const row of rows) {
        const i = list.findIndex((r) => r.id === row.id);
        if (i >= 0) list[i] = row;
        else list.push(row);
      }
      commit({ ...cur, [key]: list }, rows.map((row) => ({ kind: 'put', table, row })));
    },
    [commit],
  );

  const delRow = useCallback(
    (table: Table, id: string) => {
      const key = TABLE_KEY[table];
      const cur = dbRef.current;
      commit({ ...cur, [key]: (cur[key] as { id: string }[]).filter((r) => r.id !== id) }, [{ kind: 'del', table, id }]);
    },
    [commit],
  );

  const newTask = useCallback(
    (p: Partial<Task> & Pick<Task, 'title'>): Task => ({
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
      created_at: new Date().toISOString(),
      ...p,
    }),
    [userId],
  );

  const store = useMemo<Store>(() => {
    const dayLevel = (date: string): Level =>
      db.dayLogs.find((d) => d.date === date)?.level ?? db.profile.default_level;
    return {
      status,
      error,
      mode: backend.mode,
      email: user?.email ?? null,
      db,
      toast,
      showToast,
      addTask(p) {
        const t = newTask(p);
        putRows('tasks', [t]);
        return t;
      },
      addTasks(list) {
        putRows('tasks', list.map(newTask));
      },
      updateTask(id, patch) {
        const t = dbRef.current.tasks.find((x) => x.id === id);
        if (t) putRows('tasks', [{ ...t, ...patch }]);
      },
      deleteTask(id) {
        delRow('tasks', id);
      },
      addHabit(p) {
        const h: Habit = { ...p, id: uid(), user_id: userId, archived: false, created_at: new Date().toISOString() };
        putRows('habits', [h]);
        return h;
      },
      updateHabit(id, patch) {
        const h = dbRef.current.habits.find((x) => x.id === id);
        if (h) putRows('habits', [{ ...h, ...patch }]);
      },
      deleteHabit(id) {
        const cur = dbRef.current;
        const next = { ...cur, habits: cur.habits.filter((h) => h.id !== id), checkins: cur.checkins.filter((c) => c.habit_id !== id) };
        commit(next, [{ kind: 'del', table: 'habits', id }]);
      },
      checkIn(habitId, date, level, note = null) {
        const existing = dbRef.current.checkins.find((c) => c.habit_id === habitId && c.date === date);
        if (!level) {
          if (existing) delRow('habit_checkins', existing.id);
          return;
        }
        const row: Checkin = { id: existing?.id ?? uid(), user_id: userId, habit_id: habitId, date, level, note: note ?? existing?.note ?? null };
        putRows('habit_checkins', [row]);
      },
      setDay(date, patch) {
        const existing = dbRef.current.dayLogs.find((d) => d.date === date);
        const row: DayLog = {
          id: existing?.id ?? uid(),
          user_id: userId,
          date,
          energy: existing?.energy ?? null,
          level: existing?.level ?? dbRef.current.profile.default_level,
          ...patch,
        };
        putRows('day_logs', [row]);
      },
      dayLevel,
      addSession(s) {
        putRows('focus_sessions', [{ ...s, id: uid(), user_id: userId }]);
      },
      saveReview(weekStart, patch) {
        const existing = dbRef.current.reviews.find((r) => r.week_start === weekStart);
        putRows('weekly_reviews', [
          { id: existing?.id ?? uid(), user_id: userId, week_start: weekStart, slipped_reason: null, change_note: null, ...existing, ...patch },
        ]);
      },
      updateProfile(patch) {
        const next = { ...dbRef.current.profile, ...patch };
        commit({ ...dbRef.current, profile: next }, [{ kind: 'profile', row: next }]);
      },
      loadSample() {
        const s = sampleData(userId);
        putRows('tasks', s.tasks);
        putRows('habits', s.habits);
        putRows('habit_checkins', s.checkins);
        putRows('day_logs', s.dayLogs);
        showToast('Sample week loaded');
      },
      async resetAll() {
        await adapter.wipe(userId);
        const fresh = { ...emptyDB(userId), profile: { ...dbRef.current.profile, onboarded: false } };
        commit(fresh, [{ kind: 'profile', row: fresh.profile }]);
      },
      async signOut() {
        if (backend.auth) await backend.auth.signOut();
      },
    };
  }, [status, error, user, db, toast, showToast, newTask, putRows, delRow, commit, adapter, userId]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

