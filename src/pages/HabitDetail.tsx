import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../data/store';
import { LEVELS, LEVEL_LABEL, type Level } from '../data/types';
import { addDays, fmtShort, fromISO, today, weekStart } from '../lib/dates';
import { labelFor, levelOn, streak } from '../lib/logic';
import { Icon, LevelSwitch } from '../components/ui';

export default function HabitDetail() {
  const { id } = useParams();
  const { db, checkIn, updateHabit, deleteHabit, showToast } = useStore();
  const nav = useNavigate();
  const h = db.habits.find((x) => x.id === id);
  const t0 = today();
  const [sel, setSel] = useState(t0);
  if (!h)
    return (
      <div className="page">
        <p className="sub">Habit not found.</p>
        <Link to="/habits" className="btn" style={{ marginTop: 12 }}>
          All habits
        </Link>
      </div>
    );

  const start = addDays(weekStart(t0), -28);
  const days = Array.from({ length: 35 }, (_, i) => addDays(start, i));
  const mine = db.checkins.filter((c) => c.habit_id === h.id);
  const last30 = mine.filter((c) => c.date > addDays(t0, -30));
  const count = (l: Level) => last30.filter((c) => c.level === l).length;
  const s = streak(db.checkins, h.id);
  const selLevel = levelOn(db.checkins, h.id, sel);

  return (
    <div className="page">
      <div className="between">
        <Link to="/habits" className="btn sm ghost">
          <Icon name="back" size={16} /> Habits
        </Link>
        <Link to={`/habits/${h.id}/edit`} className="btn sm ghost">
          Edit
        </Link>
      </div>
      <h1 className="h1" style={{ marginTop: 16 }}>{h.name}</h1>
      <p className="sub">
        {h.cue || 'No cue'}
        {h.remind_at ? ` · ${h.remind_at}` : ''}
      </p>

      <div className="grid2" style={{ marginTop: 16 }}>
        <div className="card pad" style={{ background: 'var(--max-bg)', borderColor: 'transparent' }}>
          <div className="lbl" style={{ color: 'var(--max-fg)' }}>Streak</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--max-fg)' }}>
            {s} {s === 1 ? 'day' : 'days'}
          </div>
        </div>
        <div className="card pad" style={{ background: 'var(--target-bg)', borderColor: 'transparent' }}>
          <div className="lbl" style={{ color: 'var(--target-fg)' }}>Last 30 days</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--target-fg)' }}>{last30.length} of 30</div>
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 12 }}>
        <div className="between">
          <span className="lbl">Last 5 weeks</span>
          <span className="small muted">
            {count('target')} × 100% · {count('min')} × Min · {count('max')} × Max
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginTop: 12 }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="lbl" style={{ textAlign: 'center', fontSize: 10 }}>{d}</div>
          ))}
          {days.map((d) => {
            const lv = levelOn(db.checkins, h.id, d);
            const future = d > t0;
            return (
              <button
                key={d}
                disabled={future}
                onClick={() => setSel(d)}
                aria-label={`${fmtShort(d)}: ${lv ? LEVEL_LABEL[lv] : 'no check-in'}`}
                aria-pressed={sel === d}
                style={{
                  aspectRatio: '1',
                  borderRadius: 12,
                  border: sel === d ? '2px solid var(--text)' : '0',
                  background: lv === 'min' ? 'var(--amber)' : lv === 'target' ? 'var(--green-bar)' : lv === 'max' ? 'var(--crimson)' : 'var(--track)',
                  color: lv ? '#fff' : 'var(--muted)',
                  fontSize: 12,
                  fontWeight: 800,
                  opacity: future ? 0.35 : 1,
                  padding: 0,
                }}
              >
                {fromISO(d).getDate()}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 14 }}>
          <div className="small" style={{ marginBottom: 8 }}>
            {sel === t0 ? 'Today' : fmtShort(sel)}: {selLevel ? `${LEVEL_LABEL[selLevel]} · ${labelFor(h, selLevel)}` : 'no check-in'}
          </div>
          <LevelSwitch value={selLevel} onChange={(l) => checkIn(h.id, sel, l === selLevel ? null : l)} label={`Level on ${sel}`} />
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 12 }}>
        <div className="lbl">Your levels</div>
        <div className="stack" style={{ gap: 8, marginTop: 10 }}>
          {LEVELS.map((l) => (
            <div key={l} className="row">
              <span className={`chip ${l}`} style={{ width: 56, justifyContent: 'center' }}>{LEVEL_LABEL[l]}</span>
              <span style={{ fontWeight: 800 }}>{labelFor(h, l)}</span>
            </div>
          ))}
        </div>
        {count('target') + count('max') >= 20 && <div className="banner" style={{ marginTop: 12, background: 'var(--target-bg)', color: 'var(--target-fg)' }}>You hit 100% or more on {count('target') + count('max')} of the last 30 days. Time to raise the target?</div>}
        {count('min') >= 12 && <div className="banner" style={{ marginTop: 12 }}>Min on {count('min')} of the last 30 days. A smaller 100% might fit your life better.</div>}
      </div>

      <div className="row" style={{ justifyContent: 'center', gap: 18, marginTop: 20 }}>
        <button className="link" style={{ color: 'var(--muted)' }} onClick={() => { updateHabit(h.id, { archived: !h.archived }); showToast(h.archived ? 'Habit restored' : 'Habit archived'); }}>
          {h.archived ? 'Restore habit' : 'Archive habit'}
        </button>
        <button
          className="link"
          style={{ color: 'var(--muted)' }}
          onClick={() => {
            if (!window.confirm(`Delete "${h.name}" and all its check-ins?`)) return;
            deleteHabit(h.id);
            showToast('Habit deleted');
            nav('/habits');
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
