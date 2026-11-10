import { useState } from 'react';
import { useStore } from '../data/store';
import { Mark } from '../components/ui';
import type { Level } from '../data/types';

const SLIDES: { level: Level; chip: string; title: string; text: string; ex: string; w: number; color: string }[] = [
  { level: 'min', chip: 'Min', title: 'Min is the floor.', text: 'Two to five minutes you can do on your worst day. It keeps the streak alive.', ex: 'Learn English · 5 cards · 3 min', w: 13, color: 'var(--amber)' },
  { level: 'target', chip: '100%', title: '100% is a normal day.', text: 'Your real target. Most days should land here, and that is enough.', ex: 'Learn English · 15 cards · 20 min', w: 38, color: 'var(--green-bar)' },
  { level: 'max', chip: 'Max', title: 'Max is the ceiling.', text: 'For days with extra energy. It is a limit too, so today never steals from tomorrow.', ex: 'Learn English · 40 cards · 45 min', w: 100, color: 'var(--crimson)' },
];

export default function Welcome() {
  const { db, updateProfile, loadSample } = useStore();
  const [step, setStep] = useState(-1);
  const [name, setName] = useState(db.profile.display_name);
  const [cap, setCap] = useState(db.profile.weekly_capacity_h);
  const [start, setStart] = useState(db.profile.work_start);
  const [end, setEnd] = useState(db.profile.work_end);
  const [focus, setFocus] = useState(db.profile.focus_window);
  const [sample, setSample] = useState(true);

  function finish() {
    updateProfile({ display_name: name.trim(), weekly_capacity_h: cap, work_start: start, work_end: end, focus_window: focus, onboarded: true });
    if (sample && db.tasks.length === 0) loadSample();
  }

  if (step === -1)
    return (
      <div className="page" style={{ maxWidth: 520, minHeight: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 40 }}>
        <div className="row" style={{ gap: 12 }}>
          <span className="brand-tile" style={{ width: 52, height: 52, borderRadius: 16 }}>
            <Mark size={28} />
          </span>
          <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em' }}>tessera</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20, padding: '40px 0' }}>
          <h1 className="h1" style={{ fontSize: 48 }}>Every task in its place. Every habit survives bad days.</h1>
          <p className="sub" style={{ fontSize: 18, lineHeight: '27px' }}>
            Tessera sorts a messy list into three things a day, and gives every task and habit a Min, a 100% and a Max.
          </p>
        </div>
        <button className="btn block" onClick={() => setStep(0)}>
          Begin
        </button>
      </div>
    );

  if (step < 3) {
    const s = SLIDES[step];
    return (
      <div className="page" style={{ maxWidth: 520, minHeight: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 40 }}>
        <div className="between">
          <div className="row" style={{ gap: 6 }} aria-label={`Step ${step + 1} of 3`}>
            {SLIDES.map((_, i) => (
              <i key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, background: i === step ? 'var(--crimson)' : 'var(--border)' }} />
            ))}
          </div>
          <button className="link" style={{ color: 'var(--muted)' }} onClick={() => setStep(3)}>
            Skip
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '30px 0' }}>
          <div className="hero" style={{ height: 250, display: 'flex', flexDirection: 'column', borderRadius: 34, padding: 24 }}>
            <span className={`chip ${s.level}`} style={{ width: 'fit-content', height: 32, fontSize: 15 }}>
              {s.chip}
            </span>
            <div style={{ flex: 1 }} />
            <div className="note">{s.ex}</div>
            <div style={{ height: 14, borderRadius: 7, background: 'var(--plum-2)', marginTop: 8 }}>
              <div style={{ width: `${s.w}%`, height: '100%', borderRadius: 7, background: s.color }} />
            </div>
          </div>
          <h1 className="h1" style={{ marginTop: 24 }}>{s.title}</h1>
          <p className="sub" style={{ fontSize: 18, lineHeight: '27px' }}>{s.text}</p>
        </div>
        <button className="btn block" onClick={() => setStep(step + 1)}>
          {step === 2 ? 'Set up my week' : 'Next'}
        </button>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 520 }}>
      <div className="lbl">Setup</div>
      <h1 className="h1">Your week, in hours.</h1>
      <p className="sub">Tessera plans against what you can really do, not what you wish you could.</p>
      <div className="stack" style={{ marginTop: 22, gap: 16 }}>
        <label className="field">
          <span>Your name (optional)</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>Focused hours per week · {cap} h</span>
          <input type="range" min={10} max={50} step={1} value={cap} onChange={(e) => setCap(Number(e.target.value))} style={{ accentColor: '#C93352' }} />
        </label>
        <div className="grid2">
          <label className="field">
            <span>Work starts</span>
            <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="field">
            <span>Work ends</span>
            <input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        <div className="field">
          <span>Best time for deep work</span>
          <div className="seg">
            {(['morning', 'afternoon'] as const).map((f) => (
              <button key={f} className={focus === f ? 'on' : ''} onClick={() => setFocus(f)}>
                {f === 'morning' ? 'Mornings' : 'Afternoons'}
              </button>
            ))}
          </div>
        </div>
        {db.tasks.length === 0 && (
          <label className="card pad row" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={sample} onChange={(e) => setSample(e.target.checked)} style={{ width: 22, height: 22, accentColor: '#C93352' }} />
            <span>
              <b>Start with a sample week</b>
              <br />
              <span className="small muted">12 tasks and 3 habits to explore. Delete them any time in Settings.</span>
            </span>
          </label>
        )}
        <button className="btn block" onClick={finish}>
          Open Tessera
        </button>
      </div>
    </div>
  );
}
