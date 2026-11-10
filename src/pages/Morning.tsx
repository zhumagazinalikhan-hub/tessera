import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../data/store';
import { LEVEL_LABEL, type Energy, type Level } from '../data/types';
import { addDays, fmtDay, today } from '../lib/dates';
import { DAILY_LINES, lineOfDay, lived, streak, todayTasks } from '../lib/logic';
import { LevelChip } from '../components/ui';

const OPTIONS: { e: Energy; face: string; title: string; sub: string; level: Level }[] = [
  { e: 'low', face: '😮‍💨', title: 'Running low', sub: 'Bad sleep, heavy head', level: 'min' },
  { e: 'normal', face: '🙂', title: 'Normal', sub: 'Ready for a regular day', level: 'target' },
  { e: 'high', face: '⚡', title: 'Full of energy', sub: 'Want to push today', level: 'max' },
];

export default function Morning() {
  const { db, setDay } = useStore();
  const nav = useNavigate();
  const t0 = today();
  const [step, setStep] = useState<'line' | 'energy'>('line');
  const [pick, setPick] = useState<Energy>(db.dayLogs.find((d) => d.date === t0)?.energy ?? 'normal');
  const line = lineOfDay(t0);
  const y = addDays(t0, -1);
  const yLevel = lived(db, y);
  const s = streak(db.checkins);
  const opt = OPTIONS.find((o) => o.e === pick)!;
  const tasks = todayTasks(db).filter((t) => t.status === 'open');

  if (step === 'line')
    return (
      <div style={{ minHeight: '100vh', background: '#241B1F', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -60, top: 40, width: 220, height: 220, borderRadius: 60, background: '#C93352', transform: 'rotate(14deg)' }} />
        <div style={{ position: 'absolute', right: 40, top: 170, width: 96, height: 120, borderRadius: 28, background: '#E9A63A', transform: 'rotate(9deg)' }} />
        <div className="page" style={{ maxWidth: 560, minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', paddingBottom: 40 }}>
          <div className="between" style={{ fontWeight: 800, opacity: 0.85 }}>
            <span>Good morning{db.profile.display_name ? `, ${db.profile.display_name}` : ''}</span>
            <span>{fmtDay(t0, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 0' }}>
            <div className="lbl" style={{ color: '#F1C66A', fontSize: 13 }}>Today's line</div>
            <div style={{ fontSize: 46, lineHeight: '50px', fontWeight: 900, letterSpacing: '-0.02em', marginTop: 12, maxWidth: 420 }}>{line.text}</div>
            <div className="row" style={{ gap: 6, marginTop: 22 }} aria-hidden="true">
              {DAILY_LINES.map((_, i) => (
                <i key={i} style={{ width: i === line.index ? 22 : 8, height: 8, borderRadius: 4, background: i === line.index ? '#fff' : 'rgba(255,255,255,0.3)' }} />
              ))}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 24, padding: '14px 16px' }} className="row">
            {yLevel ? <LevelChip level={yLevel} /> : <span className="chip">Rest</span>}
            <span className="grow">
              <span style={{ display: 'block', fontWeight: 900 }}>{yLevel ? 'Yesterday counted' : 'Yesterday was a rest day'}</span>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#D9C7CC' }}>
                {s > 0 ? `${s} ${s === 1 ? 'day' : 'days'} in a row, Min or better` : 'Today is a fine day to start'}
              </span>
            </span>
          </div>
          <button className="btn block" style={{ marginTop: 14, background: '#fff', color: '#2A1B20', boxShadow: 'none' }} onClick={() => setStep('energy')}>
            Start my day
          </button>
          <button className="link" style={{ color: '#D9C7CC', marginTop: 14 }} onClick={() => nav('/')}>
            Skip to Today
          </button>
        </div>
      </div>
    );

  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <div className="lbl">{fmtDay(t0)}</div>
      <h1 className="h1">How are you today?</h1>
      <p className="sub">One tap. Tessera suggests the day level.</p>
      <div className="stack" style={{ marginTop: 18 }} role="radiogroup" aria-label="Energy">
        {OPTIONS.map((o) => (
          <button
            key={o.e}
            role="radio"
            aria-checked={pick === o.e}
            className="card item"
            onClick={() => setPick(o.e)}
            style={{ textAlign: 'left', borderColor: pick === o.e ? 'var(--crimson)' : undefined, background: pick === o.e ? 'var(--max-bg)' : undefined }}
          >
            <span style={{ fontSize: 30, width: 40, textAlign: 'center' }} aria-hidden="true">{o.face}</span>
            <span className="grow">
              <span className="title" style={{ display: 'block' }}>{o.title}</span>
              <span className="meta">{o.sub}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="hero amber" style={{ marginTop: 14 }}>
        <div className="lbl">Suggested level</div>
        <div className="big">{LEVEL_LABEL[opt.level]}</div>
        <div className="note" style={{ maxWidth: 260 }}>
          {opt.level === 'min'
            ? 'Every task and habit at its floor. The day still counts.'
            : opt.level === 'max'
              ? 'Go for the stretch, and stop at the ceiling.'
              : `${tasks.length} tasks, habits at their usual target.`}
        </div>
      </div>
      <button
        className="btn block"
        style={{ marginTop: 18 }}
        onClick={() => {
          setDay(t0, { energy: pick, level: opt.level });
          nav('/');
        }}
      >
        Start the day at {LEVEL_LABEL[opt.level]}
      </button>
    </div>
  );
}
