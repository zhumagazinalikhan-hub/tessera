import { useState } from 'react';
import { useStore } from '../data/store';
import type { Level } from '../data/types';
import { fromISO, today, toISO } from '../lib/dates';
import { ALL_DONE_COLOR, allHabitsDone, lived, todayTasks } from '../lib/logic';
import { PageHead } from '../components/ui';

const COLOR: Record<Level, string> = { min: 'var(--amber)', target: 'var(--green-bar)', max: 'var(--crimson)' };

export default function Month() {
  const { db } = useStore();
  const t0 = today();
  const [offset, setOffset] = useState(0);
  const base = fromISO(t0);
  const first = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const n = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: n }, (_, i) => toISO(new Date(first.getFullYear(), first.getMonth(), i + 1)));
  const lead = (first.getDay() + 6) % 7;
  const levels = days.map((d) => (d <= t0 ? lived(db, d) : null));
  const past = days.filter((d) => d <= t0);
  const c = (l: Level) => levels.filter((x) => x === l).length;
  const kept = levels.filter(Boolean).length;
  const title = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  // Pattern: habit completion on heavy vs light task days.
  const cap = (db.profile.weekly_capacity_h * 60) / 5;
  const habits = db.habits.filter((h) => !h.archived).length || 1;
  const rate = (ds: string[]) => (ds.length ? ds.reduce((a, d) => a + db.checkins.filter((x) => x.date === d).length / habits, 0) / ds.length : null);
  const planned = (d: string) => todayTasks(db, d).reduce((a, t) => a + t.estimate_min, 0);
  const heavy = past.filter((d) => planned(d) > cap);
  const light = past.filter((d) => planned(d) > 0 && planned(d) <= cap);
  const rh = rate(heavy);
  const rl = rate(light);

  return (
    <div className="page">
      <PageHead
        over="Your month"
        title={title}
        sub="The level each day was lived at."
        right={
          <div className="row" style={{ gap: 6 }}>
            <button className="icon-btn" aria-label="Previous month" onClick={() => setOffset(offset - 1)}>‹</button>
            <button className="icon-btn" aria-label="Next month" disabled={offset >= 0} onClick={() => setOffset(offset + 1)}>›</button>
          </div>
        }
      />
      <div className="card pad" style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="lbl" style={{ textAlign: 'center', fontSize: 10 }}>{d}</div>
          ))}
          {Array.from({ length: lead }, (_, i) => <div key={`x${i}`} />)}
          {days.map((d, i) => {
            const lv = levels[i];
            return (
              <div
                key={d}
                title={d}
                style={{
                  aspectRatio: '1',
                  borderRadius: 12,
                  background: d <= t0 && allHabitsDone(db, d) ? ALL_DONE_COLOR : lv ? COLOR[lv] : 'var(--track)',
                  color: lv ? '#fff' : 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                  opacity: d > t0 ? 0.35 : 1,
                  outline: d === t0 ? '2px solid var(--text)' : undefined,
                }}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
        <div className="row small" style={{ gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--target-fg)' }}>100% · {c('target')}</span>
          <span style={{ color: 'var(--min-fg)' }}>Min · {c('min')}</span>
          <span style={{ color: 'var(--max-fg)' }}>Max · {c('max')}</span>
          <span style={{ color: ALL_DONE_COLOR }}>All habits · {past.filter((d) => allHabitsDone(db, d)).length}</span>
          <span className="muted">Rest · {past.length - kept}</span>
        </div>
      </div>

      <div className="hero" style={{ marginTop: 12, background: 'var(--grad)' }}>
        <div className="lbl" style={{ color: '#FBD9DF' }}>{title}</div>
        <div style={{ fontSize: 60, lineHeight: '64px', fontWeight: 900, letterSpacing: '-0.03em' }}>
          {kept}
          <span style={{ fontSize: 24 }}> / {past.length}</span>
        </div>
        <div style={{ fontWeight: 800 }}>days kept. Min or better.</div>
      </div>

      <div className="hero amber" style={{ marginTop: 12 }}>
        <div className="lbl">Pattern</div>
        <div style={{ fontSize: 17, lineHeight: '24px', fontWeight: 800, marginTop: 6, maxWidth: 440 }}>
          {rh !== null && rl !== null
            ? `On heavy task days you kept ${Math.round(rh * 100)}% of habits, on lighter days ${Math.round(rl * 100)}%.`
            : 'Plan a few days with Today’s three, and Tessera will show how task load affects your habits.'}
        </div>
        {rh !== null && rl !== null && rh < rl && <div className="note" style={{ color: '#F1C66A', marginTop: 6 }}>Keep heavy days under {Math.round(cap / 60)} h.</div>}
      </div>
    </div>
  );
}
