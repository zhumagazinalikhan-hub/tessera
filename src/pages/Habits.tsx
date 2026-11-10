import { Link } from 'react-router-dom';
import { useStore } from '../data/store';
import { addDays, today } from '../lib/dates';
import { levelOn, streak } from '../lib/logic';
import { Icon, Mark, PageHead } from '../components/ui';

export default function Habits() {
  const { db } = useStore();
  const t0 = today();
  const habits = db.habits.filter((h) => !h.archived);
  const archived = db.habits.filter((h) => h.archived);
  const days = Array.from({ length: 14 }, (_, i) => addDays(t0, i - 13));

  return (
    <div className="page">
      <PageHead
        over={`${habits.length} active`}
        title="Habits"
        sub="The last 14 days, one dot each. Any level counts."
        right={
          <Link to="/habits/new" className="btn sm">
            <Icon name="plus" size={16} stroke={2.4} /> Habit
          </Link>
        }
      />

      {habits.length === 0 ? (
        <div className="empty" style={{ marginTop: 30 }}>
          <div style={{ position: 'relative', width: 200, height: 150, margin: '0 auto' }}>
            <div style={{ position: 'absolute', left: 20, top: 20, width: 110, height: 110, borderRadius: 32, border: '3px dashed var(--border)', transform: 'rotate(-8deg)' }} />
            <div style={{ position: 'absolute', right: 16, top: 8, width: 70, height: 88, borderRadius: 22, background: 'var(--amber)', transform: 'rotate(9deg)' }} />
            <div style={{ position: 'absolute', left: 62, bottom: 6, width: 76, height: 76, borderRadius: 24, background: 'var(--crimson)', transform: 'rotate(14deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mark size={30} />
            </div>
          </div>
          <h2 className="h2" style={{ marginTop: 22, fontSize: 28 }}>Start with one habit.</h2>
          <p className="sub" style={{ maxWidth: 320, margin: '8px auto 0' }}>Make the Min so small it feels silly. Two minutes is enough to begin.</p>
          <Link to="/habits/new" className="btn" style={{ marginTop: 20 }}>
            Add my first habit
          </Link>
        </div>
      ) : (
        <div className="stack" style={{ marginTop: 16 }}>
          {habits.map((h) => {
            const s = streak(db.checkins, h.id);
            return (
              <Link key={h.id} to={`/habits/${h.id}`} className="card" style={{ padding: '14px 16px', display: 'block' }}>
                <div className="between">
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 900 }}>{h.name}</div>
                    <div className="small muted">{h.cue || 'No cue yet'}{h.remind_at ? ` · ${h.remind_at}` : ''}</div>
                  </div>
                  <span className="chip max">{s} {s === 1 ? 'day' : 'days'}</span>
                </div>
                <div className="row" style={{ gap: 4, marginTop: 12, flexWrap: 'wrap' }}>
                  {days.map((d) => {
                    const lv = levelOn(db.checkins, h.id, d);
                    return <span key={d} className={`dot ${lv ?? ''}`} title={`${d}: ${lv ?? 'none'}`} style={d === t0 ? { outline: '2px solid var(--border)', outlineOffset: 1 } : undefined} />;
                  })}
                </div>
              </Link>
            );
          })}
          <div className="row small muted" style={{ gap: 14, marginTop: 4 }}>
            <span className="row" style={{ gap: 6 }}><span className="dot min" /> Min</span>
            <span className="row" style={{ gap: 6 }}><span className="dot target" /> 100%</span>
            <span className="row" style={{ gap: 6 }}><span className="dot max" /> Max</span>
          </div>
        </div>
      )}

      {archived.length > 0 && (
        <>
          <div className="section">
            <span className="lbl">Archived</span>
          </div>
          <div className="stack" style={{ gap: 6 }}>
            {archived.map((h) => (
              <Link key={h.id} to={`/habits/${h.id}`} className="card item done">
                <span className="grow title">{h.name}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
