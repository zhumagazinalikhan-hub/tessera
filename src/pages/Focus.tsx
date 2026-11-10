import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../data/store';
import { LEVEL_LABEL, LEVELS, type Level } from '../data/types';
import { fmtClock, fmtHours, today } from '../lib/dates';
import { Icon } from '../components/ui';

interface Timer {
  taskId: string;
  startedAt: number; // first start, ms
  plannedMin: number;
  runningSince: number | null; // ms when last resumed
  elapsedMs: number; // accumulated before runningSince
}

const KEY = 'tessera.focus';
const loadTimer = (): Timer | null => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null');
  } catch {
    return null;
  }
};
const saveTimer = (t: Timer | null) => {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

export default function Focus() {
  const { id } = useParams();
  const { db, updateTask, addSession, dayLevel, showToast } = useStore();
  const nav = useNavigate();
  const task = db.tasks.find((t) => t.id === id);
  const [timer, setTimer] = useState<Timer | null>(() => {
    const t = loadTimer();
    return t && t.taskId === id ? t : null;
  });
  const [now, setNow] = useState(Date.now());
  const [ending, setEnding] = useState(false);
  const [pick, setPick] = useState<Level>('target');

  useEffect(() => {
    const i = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(i);
  }, []);
  useEffect(() => saveTimer(timer), [timer]);

  const elapsed = timer ? timer.elapsedMs + (timer.runningSince ? now - timer.runningSince : 0) : 0;
  const plannedMs = (timer?.plannedMin ?? task?.estimate_min ?? 60) * 60000;
  const left = (plannedMs - elapsed) / 1000;
  const running = !!timer?.runningSince;

  useEffect(() => {
    document.title = running ? `${fmtClock(left)} · ${task?.title ?? 'Focus'}` : 'Tessera';
    return () => {
      document.title = 'Tessera';
    };
  }, [running, left, task?.title]);

  if (!task)
    return (
      <div className="page">
        <p className="sub">This task no longer exists.</p>
        <Link to="/" className="btn" style={{ marginTop: 12 }}>
          Back to Today
        </Link>
      </div>
    );

  const level = dayLevel(today());
  const plannedMin = level === 'min' && task.min_note ? Math.min(task.estimate_min, 30) : task.estimate_min;

  const start = () => setTimer({ taskId: task.id, startedAt: Date.now(), plannedMin, runningSince: Date.now(), elapsedMs: 0 });
  const pause = () => timer && setTimer({ ...timer, elapsedMs: elapsed, runningSince: null });
  const resume = () => timer && setTimer({ ...timer, runningSince: Date.now() });
  const extend = () => timer && setTimer({ ...timer, plannedMin: timer.plannedMin + 15 });

  function finish() {
    const actual = Math.max(1, Math.round(elapsed / 60000));
    addSession({ task_id: task!.id, started_at: new Date(timer?.startedAt ?? Date.now()).toISOString(), planned_min: timer?.plannedMin ?? plannedMin, actual_min: actual, level: pick });
    if (pick === 'min') updateTask(task!.id, { estimate_min: Math.max(15, task!.estimate_min - actual) });
    else updateTask(task!.id, { status: 'done', done_at: new Date().toISOString(), done_level: pick });
    setTimer(null);
    showToast(pick === 'min' ? `Min reached. ${fmtHours(actual)} logged, the rest stays open.` : `Done at ${LEVEL_LABEL[pick]}. Take a break.`);
    nav('/');
  }

  const R = 104;
  const C = 2 * Math.PI * R;
  const prog = timer ? Math.min(1, elapsed / plannedMs) : 0;
  const minText = task.min_note ?? 'A first small piece';

  if (ending)
    return (
      <div className="page" style={{ maxWidth: 560 }}>
        <div className="hero amber">
          <div className="lbl">Session done</div>
          <div className="big">{fmtHours(Math.max(1, Math.round(elapsed / 60000)))}</div>
          <div className="note" style={{ maxWidth: 260 }}>{task.title}</div>
        </div>
        <h2 className="h2" style={{ marginTop: 20 }}>Which level did you reach?</h2>
        <div className="stack" style={{ marginTop: 12 }} role="radiogroup" aria-label="Level reached">
          {LEVELS.map((l) => (
            <button
              key={l}
              role="radio"
              aria-checked={pick === l}
              className="card item"
              onClick={() => setPick(l)}
              style={{ textAlign: 'left', borderColor: pick === l ? 'var(--green)' : undefined }}
            >
              <span className="grow">
                <span className={`chip ${l}`}>{LEVEL_LABEL[l]}</span>
                <span className="title" style={{ display: 'block', marginTop: 6 }}>
                  {l === 'min' ? minText : l === 'target' ? 'Finished as planned' : 'Finished, plus extra'}
                </span>
                <span className="meta">{l === 'min' ? 'The floor. It counts, and the task stays open.' : l === 'target' ? 'The plan for today.' : 'Only if energy was left over.'}</span>
              </span>
              <span className={`check ${pick === l ? 'on' : ''}`} aria-hidden="true">
                {pick === l && <Icon name="check" size={15} stroke={3.2} color="#fff" />}
              </span>
            </button>
          ))}
        </div>
        <button className="btn block" style={{ marginTop: 18 }} onClick={finish}>
          Save and take a break
        </button>
        <button className="link" style={{ display: 'block', margin: '14px auto 0' }} onClick={() => setEnding(false)}>
          Keep going
        </button>
      </div>
    );

  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <div className="between">
        <Link to="/" className="btn sm ghost">
          <Icon name="back" size={16} /> Today
        </Link>
        <span className={`chip ${task.kind === 'deep' ? 'max' : 'min'}`}>{task.kind === 'deep' ? 'Deep work' : 'Routine'}</span>
      </div>
      <div style={{ textAlign: 'center', marginTop: 22 }}>
        <div className="lbl">Now focusing on</div>
        <h1 className="h1" style={{ fontSize: 32 }}>{task.title}</h1>
        <p className="sub">
          {level === 'min' && task.min_note ? `Min today: ${task.min_note}` : `Planned ${fmtHours(plannedMin)}`}
        </p>
      </div>
      <div style={{ position: 'relative', width: 260, height: 260, margin: '24px auto 0' }}>
        <svg width="260" height="260" viewBox="0 0 250 250" aria-hidden="true">
          <defs>
            <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#CC3050" />
              <stop offset="1" stopColor="#C4542A" />
            </linearGradient>
          </defs>
          <circle cx="125" cy="125" r={R} fill="none" stroke="var(--track)" strokeWidth="18" />
          <circle cx="125" cy="125" r={R} fill="none" stroke="url(#fg)" strokeWidth="18" strokeLinecap="round" strokeDasharray={`${C * prog} ${C}`} transform="rotate(-90 125 125)" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }} aria-live="polite">
          <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-0.02em' }}>{fmtClock(timer ? left : plannedMin * 60)}</div>
          <div className="small muted">{!timer ? 'ready' : left < 0 ? 'over time' : running ? 'left' : 'paused'}</div>
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <span className="chip min">Min · {minText}</span>
        <span className="chip target">100% · done</span>
      </div>

      <div style={{ marginTop: 26 }}>
        {!timer ? (
          <button className="btn block" onClick={start}>
            <Icon name="play" size={18} /> Start focus
          </button>
        ) : (
          <>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn ghost" style={{ flex: 1 }} onClick={running ? pause : resume}>
                {running ? 'Pause' : 'Resume'}
              </button>
              <button className="btn ghost" style={{ flex: 1 }} onClick={extend}>
                +15 min
              </button>
            </div>
            <button className="btn block" style={{ marginTop: 10 }} onClick={() => { pause(); setEnding(true); }}>
              Finish session
            </button>
          </>
        )}
      </div>
    </div>
  );
}
