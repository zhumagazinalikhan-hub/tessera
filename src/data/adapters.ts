import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { DB, Profile, Table } from './types';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null = URL && KEY ? createClient(URL, KEY) : null;
export const isCloud = supabase !== null;

export type Change =
  | { kind: 'put'; table: Table; row: { id: string } }
  | { kind: 'del'; table: Table; id: string }
  | { kind: 'profile'; row: Profile };

export interface Adapter {
  load(userId: string): Promise<DB>;
  persist(next: DB, change: Change): Promise<void>;
  wipe(userId: string): Promise<void>;
}

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthApi {
  onChange(cb: (u: AuthUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<{ needsConfirm: boolean }>;
  signUp(email: string, password: string): Promise<{ needsConfirm: boolean }>;
  google?: () => Promise<void>;
  signOut(): Promise<void>;
}

export function defaultProfile(id: string): Profile {
  return {
    id,
    display_name: '',
    weekly_capacity_h: 30,
    work_start: '09:00',
    work_end: '17:00',
    focus_window: 'morning',
    default_level: 'target',
    theme: 'light',
    onboarded: false,
    show_ayah: true,
    ayah_lang: 'en',
  };
}

export function emptyDB(userId: string): DB {
  return { profile: defaultProfile(userId), tasks: [], habits: [], checkins: [], dayLogs: [], sessions: [], reviews: [] };
}

// ---------- Demo mode: everything in this browser ----------
const LS_KEY = 'tessera.db.v1';

export const localAdapter: Adapter = {
  async load(userId) {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as DB;
        return { ...emptyDB(userId), ...saved, profile: { ...defaultProfile(userId), ...saved.profile } };
      }
    } catch {
      /* storage unavailable: start empty */
    }
    return emptyDB(userId);
  },
  async persist(next) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(next));
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  },
  async wipe() {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      /* ignore */
    }
  },
};

// ---------- Cloud mode: Supabase ----------
const CONFLICT: Partial<Record<Table, string>> = {
  habit_checkins: 'habit_id,date',
  day_logs: 'user_id,date',
  weekly_reviews: 'user_id,week_start',
};

export const cloudAdapter: Adapter = {
  async load(userId) {
    const sb = supabase!;
    const [p, t, h, c, d, s, r] = await Promise.all([
      sb.from('profiles').select('*').eq('id', userId).maybeSingle(),
      sb.from('tasks').select('*').order('created_at'),
      sb.from('habits').select('*').order('created_at'),
      sb.from('habit_checkins').select('id,user_id,habit_id,date,level,note'),
      sb.from('day_logs').select('*'),
      sb.from('focus_sessions').select('id,user_id,task_id,started_at,planned_min,actual_min,level'),
      sb.from('weekly_reviews').select('id,user_id,week_start,slipped_reason,change_note'),
    ]);
    const err = [p, t, h, c, d, s, r].find((x) => x.error)?.error;
    if (err) throw err;
    let profile = p.data as Profile | null;
    if (!profile) {
      profile = defaultProfile(userId);
      await sb.from('profiles').upsert(profile);
    }
    return {
      profile: { ...defaultProfile(userId), ...profile, weekly_capacity_h: Number(profile.weekly_capacity_h) },
      tasks: t.data ?? [],
      habits: h.data ?? [],
      checkins: c.data ?? [],
      dayLogs: d.data ?? [],
      sessions: s.data ?? [],
      reviews: r.data ?? [],
    };
  },
  async persist(_next, change) {
    const sb = supabase!;
    let res;
    if (change.kind === 'profile') res = await sb.from('profiles').upsert(change.row);
    else if (change.kind === 'put') res = await sb.from(change.table).upsert(change.row, { onConflict: CONFLICT[change.table] ?? 'id' });
    else res = await sb.from(change.table).delete().eq('id', change.id);
    if (res.error) throw res.error;
  },
  async wipe(userId) {
    const sb = supabase!;
    for (const t of ['habit_checkins', 'focus_sessions', 'weekly_reviews', 'day_logs', 'tasks', 'habits'] as Table[]) {
      await sb.from(t).delete().eq('user_id', userId);
    }
  },
};

export const supabaseAuth: AuthApi = {
  onChange(cb) {
    const sb = supabase!;
    sb.auth.getSession().then(({ data }) => cb(data.session ? { id: data.session.user.id, email: data.session.user.email ?? null } : null));
    const { data } = sb.auth.onAuthStateChange((_e, s) => cb(s ? { id: s.user.id, email: s.user.email ?? null } : null));
    return () => data.subscription.unsubscribe();
  },
  async signIn(email, password) {
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { needsConfirm: false };
  },
  async signUp(email, password) {
    const { data, error } = await supabase!.auth.signUp({ email, password, options: { emailRedirectTo: window.location.href } });
    if (error) throw error;
    return { needsConfirm: !data.session };
  },
  async signOut() {
    await supabase!.auth.signOut();
  },
};
