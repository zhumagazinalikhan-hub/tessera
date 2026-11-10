import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../data/store';
import { Icon } from '../components/ui';

const PRESETS = [
  { name: 'Learn English', min: '5 cards · 3 min', target: '15 cards · 20 min', max: '40 cards · 45 min', cue: 'After I make my coffee' },
  { name: 'Read', min: '2 pages · 3 min', target: '10 pages · 15 min', max: '1 chapter · 40 min', cue: 'After dinner' },
  { name: 'Move', min: '5 min stretch', target: '20 min walk', max: '45 min run', cue: 'After work' },
  { name: 'Write', min: '3 sentences', target: '300 words', max: '1,000 words', cue: 'Before I open email' },
  { name: 'Meditate', min: '5 breaths', target: '10 min', max: '25 min', cue: 'After I brush my teeth' },
];

export default function HabitForm() {
  const { id } = useParams();
  const { db, addHabit, updateHabit, showToast } = useStore();
  const nav = useNavigate();
  const existing = db.habits.find((h) => h.id === id);
  const [f, setF] = useState({
    name: existing?.name ?? '',
    cue: existing?.cue ?? '',
    remind_at: existing?.remind_at ?? '',
    min_label: existing?.min_label ?? '',
    target_label: existing?.target_label ?? '',
    max_label: existing?.max_label ?? '',
  });
  const valid = f.name.trim() && f.min_label.trim() && f.target_label.trim() && f.max_label.trim();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const row = { ...f, name: f.name.trim(), cue: f.cue.trim(), remind_at: f.remind_at || null };
    if (existing) {
      updateHabit(existing.id, row);
      showToast('Habit saved');
      nav(`/habits/${existing.id}`);
    } else {
      const h = addHabit(row);
      showToast('Habit added. Start with Min.');
      nav(`/habits/${h.id}`);
    }
  }

  const field = (k: keyof typeof f, label: string, ph: string, cls?: string) => (
    <label className="field">
      <span>{cls ? <span className={`chip ${cls}`} style={{ height: 22 }}>{label}</span> : label}</span>
      <input className="input" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={ph} />
    </label>
  );

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      <Link to={existing ? `/habits/${existing.id}` : '/habits'} className="btn sm ghost">
        <Icon name="back" size={16} /> Back
      </Link>
      <h1 className="h1" style={{ marginTop: 16 }}>{existing ? 'Edit habit' : 'New habit'}</h1>
      <p className="sub">A floor, a target and a ceiling, tied to something you already do.</p>

      {!existing && (
        <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className={`chip ${f.name === p.name ? 'max on' : ''}`}
              style={{ height: 34, fontSize: 13 }}
              onClick={() => setF({ ...f, name: p.name, cue: p.cue, min_label: p.min, target_label: p.target, max_label: p.max })}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="stack" style={{ gap: 14, marginTop: 18 }}>
        {field('name', 'Habit', 'e.g. Learn English')}
        <div className="card pad stack" style={{ gap: 12 }}>
          <div className="lbl">Three levels</div>
          {field('min_label', 'Min', 'So small it feels silly', 'min')}
          {field('target_label', '100%', 'A normal day', 'target')}
          {field('max_label', 'Max', 'The ceiling, not the goal', 'max')}
        </div>
        <div className="grid2">
          {field('cue', 'After I…', 'make my coffee')}
          <label className="field">
            <span>Reminder</span>
            <input className="input" type="time" value={f.remind_at} onChange={(e) => setF({ ...f, remind_at: e.target.value })} />
          </label>
        </div>
        <div className="banner">Make Min so small it feels silly. You will still do it on your worst day.</div>
        <button className="btn block" disabled={!valid}>
          {existing ? 'Save habit' : 'Add habit'}
        </button>
      </form>
    </div>
  );
}
