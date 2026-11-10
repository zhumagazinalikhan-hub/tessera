// Renders the next days' wallpapers on this device and stores them in Firestore,
// where the iPhone Shortcut downloads today's image with a private link.
import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { fs } from './firebase';
import type { DB } from './types';
import { loadAyahForDate } from '../lib/ayah';
import { today } from '../lib/dates';
import { drawWallpaper, ensureFonts, nextDays } from '../lib/wallpaper';

export const DAYS_AHEAD = 7;

export function newToken(): string {
  const a = new Uint8Array(18);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 28);
}

export function shortcutUrl(token: string): string {
  return `https://firestore.googleapis.com/v1/projects/tessera-5216d/databases/(default)/documents/wallpapers/${token}_`;
}

export async function renderJpeg(db: DB, date: string): Promise<string> {
  await ensureFonts();
  const ayah = await loadAyahForDate(date, db.profile.ayah_lang ?? 'en').catch(() => null);
  const canvas = document.createElement('canvas');
  drawWallpaper(canvas, { db, date, ayah });
  return canvas.toDataURL('image/jpeg', 0.9);
}

export async function syncWallpapers(db: DB, uid: string, token: string): Promise<number> {
  if (!fs) throw new Error('Firebase is not configured');
  const t0 = today();
  for (const date of nextDays(t0, DAYS_AHEAD)) {
    const url = await renderJpeg(db, date);
    await setDoc(doc(fs, 'wallpapers', `${token}_${date}`), {
      uid,
      date,
      jpg: url.slice(url.indexOf(',') + 1),
      updated: new Date().toISOString(),
    });
  }
  // Remove days that have passed (and images under an old link).
  const mine = await getDocs(query(collection(fs, 'wallpapers'), where('uid', '==', uid)));
  await Promise.all(
    mine.docs.filter((d) => d.data().date < t0 || !d.id.startsWith(`${token}_`)).map((d) => deleteDoc(d.ref)),
  );
  return DAYS_AHEAD;
}
