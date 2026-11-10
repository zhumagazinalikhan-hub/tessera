import { useEffect, useRef, useState } from 'react';
import { useStore } from './store';
import { syncWallpapers } from './wallpaperSync';
import { today } from '../lib/dates';

export type SyncState = { status: 'idle' | 'syncing' | 'done' | 'error'; at: string | null; error: string | null };

let listeners: ((s: SyncState) => void)[] = [];
let state: SyncState = { status: 'idle', at: null, error: null };
const set = (s: Partial<SyncState>) => {
  state = { ...state, ...s };
  listeners.forEach((l) => l(state));
};

export function useSyncState(): SyncState {
  const [s, setS] = useState(state);
  useEffect(() => {
    listeners.push(setS);
    return () => {
      listeners = listeners.filter((l) => l !== setS);
    };
  }, []);
  return s;
}

/** Keeps the next 7 days of wallpapers up to date while the app is open. */
export function useWallpaperSync() {
  const { db, uid, mode, status } = useStore();
  const last = useRef('');
  const p = db.profile;
  useEffect(() => {
    if (mode !== 'firebase' || status !== 'ready' || !p.wallpaper_enabled || !p.wallpaper_token || !uid) return;
    const key = JSON.stringify([today(), p.wallpaper_token, p.ayah_lang, p.weekly_capacity_h, db.tasks, db.habits, db.checkins, db.dayLogs]);
    if (key === last.current) return;
    const timer = window.setTimeout(async () => {
      last.current = key;
      set({ status: 'syncing', error: null });
      try {
        await syncWallpapers(db, uid, p.wallpaper_token!);
        set({ status: 'done', at: new Date().toISOString() });
      } catch (e) {
        last.current = '';
        set({ status: 'error', error: (e as Error).message });
      }
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [db, uid, mode, status, p.wallpaper_enabled, p.wallpaper_token, p.ayah_lang, p.weekly_capacity_h]);
}

export async function syncNow(db: Parameters<typeof syncWallpapers>[0], uid: string, token: string) {
  set({ status: 'syncing', error: null });
  try {
    await syncWallpapers(db, uid, token);
    set({ status: 'done', at: new Date().toISOString() });
  } catch (e) {
    set({ status: 'error', error: (e as Error).message });
  }
}
