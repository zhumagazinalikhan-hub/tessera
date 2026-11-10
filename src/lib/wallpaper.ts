// Draws the Tessera lock-screen wallpaper for one day on a canvas.
// Layout is in iPhone points (430 × 932) and rendered at 3× (1290 × 2796).
import type { DB, Level } from '../data/types';
import type { Ayah } from './ayah';
import { addDays, fromISO, toISO } from './dates';
import { labelFor, levelOn, lineOfDay, lived, openTasks, streak, todayTasks } from './logic';
import { wordFor } from './words';

export const WP_W = 430;
export const WP_H = 932;
export const WP_SCALE = 3;

const C = {
  bg: '#000',
  card: 'rgba(255,255,255,0.065)',
  border: 'rgba(255,255,255,0.08)',
  text: '#F5ECEE',
  soft: '#EADCE0',
  muted: '#B9A8AD',
  faint: '#8C7E83',
  pink: '#FF9CB0',
  due: '#FF6B88',
  green: '#8FD8AC',
  future: 'rgba(255,255,255,0.12)',
};
const LEVEL: Record<Level, string> = { min: '#E9A63A', target: '#4CB07C', max: '#E04A68' };

export interface WallpaperInput {
  db: DB;
  date: string;
  ayah: Ayah | null;
}

type Ctx = CanvasRenderingContext2D;

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function card(ctx: Ctx, x: number, y: number, w: number, h: number, r = 22, fill = C.card, stroke = C.border) {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function font(ctx: Ctx, weight: number, size: number, family = 'Nunito') {
  ctx.font = `${weight} ${size}px ${family}, system-ui, sans-serif`;
}

function text(ctx: Ctx, s: string, x: number, y: number, color: string, align: CanvasTextAlign = 'left') {
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

function label(ctx: Ctx, s: string, x: number, y: number, color = C.muted, align: CanvasTextAlign = 'left') {
  font(ctx, 800, 9.5);
  text(ctx, s.toUpperCase().split('').join(' '), x, y, color, align);
}

function fit(ctx: Ctx, s: string, max: number): string {
  if (ctx.measureText(s).width <= max) return s;
  let t = s;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

function wrap(ctx: Ctx, s: string, max: number, lines: number): string[] {
  const words = s.split(/\s+/);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= max) cur = next;
    else {
      if (cur) out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  if (out.length > lines) {
    const kept = out.slice(0, lines);
    kept[lines - 1] = fit(ctx, out.slice(lines - 1).join(' '), max);
    return kept;
  }
  return out;
}

const hm = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
};

/** Tasks for the wallpaper: the day's picks first, then other open tasks due that day. */
function tasksFor(db: DB, date: string) {
  const picked = todayTasks(db, date);
  const extra = openTasks(db).filter((t) => t.due_date === date && t.today_date !== date);
  return [...picked, ...extra].slice(0, 4);
}

export function drawWallpaper(canvas: HTMLCanvasElement, { db, date, ayah }: WallpaperInput): number {
  canvas.width = WP_W * WP_SCALE;
  canvas.height = WP_H * WP_SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(WP_SCALE, 0, 0, WP_SCALE, 0, 0);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, WP_W, WP_H);

  const X = 18;
  const W = WP_W - 36;
  let y = 228;
  const GAP = 7;

  // ---- Ayah ----
  if (ayah) {
    font(ctx, 700, 13);
    const tr = wrap(ctx, `“${ayah.translation}”`, W - 28, 2);
    let arSize = 27;
    font(ctx, 400, arSize, 'Amiri');
    while (ctx.measureText(ayah.arabic).width > (W - 28) * 2 && arSize > 18) font(ctx, 400, --arSize, 'Amiri');
    const arLines = ctx.measureText(ayah.arabic).width > W - 28 ? 2 : 1;
    const arLH = arSize * 1.45;
    const h = 10 + 12 + arLines * arLH + 8 + tr.length * 18 + 10;
    card(ctx, X, y, W, h);
    label(ctx, 'Ayah of the day', X + 14, y + 20, C.pink);
    label(ctx, `${ayah.surahName} · ${ayah.ref}`, X + W - 14, y + 20, C.muted, 'right');
    ctx.save();
    ctx.direction = 'rtl';
    font(ctx, 400, arSize, 'Amiri');
    if (arLines === 1) text(ctx, ayah.arabic, X + W / 2, y + 22 + arLH * 0.78, '#fff', 'center');
    else {
      const parts = ayah.arabic.split(' ');
      const half = Math.ceil(parts.length / 2);
      text(ctx, parts.slice(0, half).join(' '), X + W / 2, y + 22 + arLH * 0.78, '#fff', 'center');
      text(ctx, parts.slice(half).join(' '), X + W / 2, y + 22 + arLH * 1.78, '#fff', 'center');
    }
    ctx.restore();
    font(ctx, 700, 13);
    tr.forEach((line, i) => text(ctx, line, X + W / 2, y + 22 + arLines * arLH + 22 + i * 18, C.soft, 'center'));
    y += h + GAP;
  }

  // ---- Tasks ----
  const tasks = tasksFor(db, date);
  const planned = tasks.filter((t) => t.status === 'open').reduce((a, t) => a + t.estimate_min, 0);
  const cap = Math.round((db.profile.weekly_capacity_h * 60) / 5);
  const rowH = 27;
  const tH = 8 + 16 + Math.max(1, tasks.length) * rowH + 6;
  card(ctx, X, y, W, tH);
  label(ctx, 'Today', X + 14, y + 20);
  label(ctx, tasks.length ? `${hm(planned)} · Margin ${hm(Math.max(0, cap - planned))}` : '', X + W - 14, y + 20, C.muted, 'right');
  if (!tasks.length) {
    font(ctx, 700, 13);
    text(ctx, 'Nothing planned. Pick three on your Board.', X + 14, y + 24 + 18, C.muted);
  }
  tasks.forEach((t, i) => {
    const ry = y + 26 + i * rowH;
    const done = t.status === 'done';
    rr(ctx, X + 14, ry, 21, 21, 7);
    const g = ctx.createLinearGradient(X + 14, ry, X + 35, ry + 21);
    g.addColorStop(0, done ? '#3A3036' : '#CC3050');
    g.addColorStop(1, done ? '#3A3036' : '#C4542A');
    ctx.fillStyle = g;
    ctx.fill();
    font(ctx, 900, 11);
    text(ctx, done ? '✓' : String(i + 1), X + 24.5, ry + 14.5, '#fff', 'center');
    const time = t.due_date === date && t.estimate_min ? `${hm(t.estimate_min)} · due today` : hm(t.estimate_min);
    font(ctx, 700, 11);
    const tw = ctx.measureText(time).width;
    text(ctx, time, X + W - 14, ry + 15, C.muted, 'right');
    font(ctx, 800, 13.5);
    const title = fit(ctx, t.title, W - 14 - 44 - tw - 12);
    text(ctx, title, X + 44, ry + 15.5, done ? C.faint : C.text);
    if (done) {
      const w = ctx.measureText(title).width;
      ctx.fillStyle = C.faint;
      ctx.fillRect(X + 44, ry + 10.5, w, 1.4);
    }
  });
  y += tH + GAP;

  // ---- Habits (up to 6) ----
  const habits = db.habits.filter((h) => !h.archived).slice(0, 6);
  if (habits.length) {
    const cols = 3;
    const cw = (W - GAP * (cols - 1)) / cols;
    const ch = 47;
    habits.forEach((h, i) => {
      const cx = X + (i % cols) * (cw + GAP);
      const cy = y + Math.floor(i / cols) * (ch + GAP);
      card(ctx, cx, cy, cw, ch, 16);
      const lv = levelOn(db.checkins, h.id, date);
      font(ctx, 900, 12);
      text(ctx, fit(ctx, h.name, cw - 36), cx + 9, cy + 19, C.text);
      ctx.beginPath();
      ctx.arc(cx + cw - 15, cy + 15, 7, 0, Math.PI * 2);
      if (lv) {
        ctx.fillStyle = LEVEL[lv];
        ctx.fill();
        font(ctx, 900, 9);
        text(ctx, '✓', cx + cw - 15, cy + 18.5, '#000', 'center');
      } else {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#6A5A60';
        ctx.stroke();
      }
      const s = streak(db.checkins, h.id, date);
      const sub = `${labelFor(h, lv ?? 'target').split(' · ')[0]} · ${s} d${s >= 7 ? ' 🔥' : ''}`;
      font(ctx, 700, 10);
      text(ctx, fit(ctx, sub, cw - 18), cx + 9, cy + 35, C.muted);
    });
    y += Math.ceil(habits.length / cols) * (ch + GAP);
  }

  // ---- Month dots + word ----
  const sq = (W - 8) / 2;
  const d0 = fromISO(date);
  const first = new Date(d0.getFullYear(), d0.getMonth(), 1);
  const nDays = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const dueDays = new Set(openTasks(db).filter((t) => t.due_date && t.due_date >= date).map((t) => t.due_date));
  let kept = 0;
  let past = 0;
  card(ctx, X, y, sq, sq);
  const monthName = d0.toLocaleDateString('en-GB', { month: 'long' });
  const cellW = (sq - 24) / 7;
  font(ctx, 800, 8);
  ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((l, i) => text(ctx, l, X + 12 + cellW * i + cellW / 2, y + 40, C.faint, 'center'));
  for (let n = 1; n <= nDays; n++) {
    const iso = toISO(new Date(d0.getFullYear(), d0.getMonth(), n));
    const slot = lead + n - 1;
    const cx = X + 12 + (slot % 7) * cellW + cellW / 2;
    const cy = y + 56 + Math.floor(slot / 7) * 20;
    ctx.beginPath();
    ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
    if (iso < date) {
      const lv = lived(db, iso);
      past++;
      if (lv) kept++;
      if (lv) {
        ctx.fillStyle = LEVEL[lv];
        ctx.fill();
      } else {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#4A3F44';
        ctx.stroke();
      }
    } else if (iso === date) {
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.stroke();
    } else {
      ctx.fillStyle = C.future;
      ctx.fill();
    }
    if (dueDays.has(iso) && iso !== date) {
      ctx.beginPath();
      ctx.arc(cx, cy, 9.2, 0, Math.PI * 2);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = C.due;
      ctx.stroke();
    }
  }
  label(ctx, monthName, X + 12, y + 20);
  label(ctx, past ? `${kept}/${past}` : '', X + sq - 12, y + 20, C.green, 'right');
  // legend
  font(ctx, 800, 9);
  let lx = X + 12;
  const ly = y + sq - 12;
  for (const [name, col] of [['Min', LEVEL.min], ['100%', LEVEL.target], ['Max', LEVEL.max]] as const) {
    rr(ctx, lx, ly - 7.5, 8, 8, 3);
    ctx.fillStyle = col;
    ctx.fill();
    text(ctx, name, lx + 11, ly, C.muted);
    lx += 11 + ctx.measureText(name).width + 8;
  }
  rr(ctx, lx + 1, ly - 6.5, 6, 6, 2);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = C.due;
  ctx.stroke();
  text(ctx, 'Due', lx + 11, ly, C.muted);

  // word cube
  const wx = X + sq + 8;
  rr(ctx, wx, y, sq, sq, 22);
  const wg = ctx.createLinearGradient(wx, y, wx + sq, y + sq);
  wg.addColorStop(0, 'rgba(76,176,124,0.22)');
  wg.addColorStop(0.6, 'rgba(255,255,255,0.05)');
  ctx.fillStyle = wg;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(143,216,172,0.25)';
  ctx.stroke();
  label(ctx, 'Word of the day', wx + 12, y + 20, C.green);
  const word = wordFor(date);
  let ws = 27;
  font(ctx, 900, ws);
  while (ctx.measureText(word.word).width > sq - 24 && ws > 16) font(ctx, 900, --ws);
  text(ctx, word.word, wx + 12, y + 74, '#fff');
  font(ctx, 700, 11);
  text(ctx, `${word.ipa} · ${word.pos}`, wx + 12, y + 92, C.muted);
  font(ctx, 700, 12.5);
  wrap(ctx, word.meaning, sq - 24, 3).forEach((l, i) => text(ctx, l, wx + 12, y + 114 + i * 16, C.soft));
  const yearDays = new Date(d0.getFullYear(), 1, 29).getMonth() === 1 ? 366 : 365;
  const doy = Math.round((d0.getTime() - new Date(d0.getFullYear(), 0, 1).getTime()) / 86400000) + 1;
  font(ctx, 800, 10);
  text(ctx, `${yearDays - doy} days left · ${Math.round((doy / yearDays) * 100)}% of ${d0.getFullYear()}`, wx + 12, y + sq - 12, C.pink);
  y += sq + GAP;

  // ---- Quote ----
  font(ctx, 900, 17);
  const q = wrap(ctx, `“${lineOfDay(date).text}”`, W - 16, 2);
  q.forEach((l, i) => text(ctx, l, WP_W / 2, y + 20 + i * 22, '#fff', 'center'));
  return y + 20 + (q.length - 1) * 22;
}

export async function ensureFonts() {
  await Promise.all([
    document.fonts.load('900 20px Nunito'),
    document.fonts.load('800 20px Nunito'),
    document.fonts.load('700 20px Nunito'),
    document.fonts.load('400 20px Amiri', 'فَإِنَّ'),
  ]).catch(() => undefined);
}

export function nextDays(from: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(from, i));
}
