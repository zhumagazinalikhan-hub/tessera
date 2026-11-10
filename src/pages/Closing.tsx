import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../data/store';
import { LEVEL_LABEL } from '../data/types';
import { addDays, fmtDay, fmtShort, today, weekDays, weekdayShort, weekStart } from '../lib/dates';
import { lived, levelOn } from '../lib/logic';
import { PageHead } from '../components/ui';

const REASONS = ['Too big', 'Wrong week', 'Blocked', 'Not important'];

export default function Closing() {
  const { db, saveReview, updateTask, showToast } = useStore();
  const t0 = today();
  const [offset, setOffset] = useState(0);
  const ws = addDays(weekStart(t0), offset * 7);
  const we = addDays(ws, 6);
  const days = weekDays(ws);
  const work = days.slice(0, 5);
  const inWeek = (iso: string | null) => !!iso && iso.slice(0, 10) >= ws && iso.slice(0, 10) <= we;
  const closed = db.tasks.filter((t) => t.status === 'done' && inWeek(t.done_at));
  const handed = db.tasks.filter((t) => t.status === 'delegated');
  const slipped = db.tasks.filter((t) => t.status === 'open' && ((t.due_date && t.due_date < t0 && t.due_date <= we) || (t.today_date && t.today_date < t0 && t.today_date >= ws)));
  const review = db.reviews.find((r) => r.week_start === ws);
  const [reason, setReason] = useState<string | null>(review?.slipped_reason ?? null);
  const [change, setChange] = useState(review?.change_note ?? '');
  const habits = db.habits.filter((h) => !h.archived);
  const keptDays = work.filter((d) => d <= t0 && lived(db, d)).length;
  const pastWork = work.filter((d) => d <= t0).length;

  return (
    <div className="page">
      <PageHead
        over={`Week of ${fmtDay(ws, { day: 'numeric', month: 'long' })}`}
        title="Closing"
        sub="What happened, what slipped, and one change for next week."
        right={
          <div className="row" style={{ gap: 6 }}>
            <button className="icon-btn" aria-label="Previous week" onClick={() => setOffset(offset - 1)}>‹</button>
            <button className="icon-btn" aria-label="Next week" disabled={offset >= 0} onClick={() => setOffset(offset + 1)}>›</button>
          </div>
        }
      />

      <div className="grid3" style={{ marginTop: 16 }}>
        <div className="card pad" style={{ background: 'var(--target-bg)', borderColor: 'transparent' }}>
          <div className="lbl" style={{ color: 'var(--target-fg)' }}>Closed</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--target-fg)' }}>{closed.length}</div>
        </div>
        <div className="card pad" style={{ background: 'var(--min-bg)', borderColor: 'transparent' }}>
          <div className="lbl" style={{ color: 'var(--min-fg)' }}>Handed off</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--min-fg)' }}>{handed.length}</div>
        </div>
        <div className="card pad" style={{ background: 'var(--max-bg)', borderColor: 'transparent' }}>
          <div className="lbl" style={{ color: 'var(--max-fg)' }}>Slipped</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--max-fg)' }}>{slipped.length}</div>
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 12 }}>
        <div className="between">
          <span className="lbl">Daily levels</span>
          {pastWork > 0 && <span className="small" style={{ color: 'var(--target-fg)' }}>Min or better {keptDays} of {pastWork} days</span>}
        </div>
        <div className="row" style={{ gap: 6, marginTop: 10 }}>
          {work.map((d) => {
            const lv = lived(db, d);
            return (
              <div key={d} style={{ flex: 1, textAlign: 'center' }}>
                <div className="lbl" style={{ fontSize: 10 }}>{weekdayShort(d)}</div>
                <div className={`chip ${lv ?? ''}`} style={{ marginTop: 4, width: '100%', justifyContent: 'center', opacity: d > t0 ? 0.4 : 1 }}>
                  {lv ? LEVEL_LABEL[lv] : d > t0 ? '–' : d === t0 ? 'Today' : 'Rest'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {habits.length > 0 && (
        <div className="card pad" style={{ marginTop: 12 }}>
          <div className="lbl">Habits this week</div>
          <div className="stack" style={{ gap: 10, marginTop: 10 }}>
            {habits.map((h) => {
              const lvls = days.map((d) => levelOn(db.checkins, h.id, d));
              const mins = lvls.filter((l) => l === 'min').length;
              return (
                <div key={h.id}>
                  <div className="between">
                    <span style={{ fontWeight: 900 }}>{h.name}</span>
                    <span className="small muted">{lvls.filter(Boolean).length} of 7 days</span>
                  </div>
                  <div className="row" style={{ gap: 4, marginTop: 6 }}>
                    {days.map((d, i) => (
                      <span key={d} className={`dot ${lvls[i] ?? ''}`} style={{ flex: 1, height: 12, borderRadius: 6, opacity: d > t0 ? 0.35 : 1 }} title={d} />
                    ))}
                  </div>
                  {mins >= 3 && (
                    <div className="small" style={{ marginTop: 6, color: 'var(--min-fg)' }}>
                      Min on {mins} days. <Link to={`/habits/${h.id}/edit`} className="link" style={{ fontSize: 13 }}>Make 100% smaller?</Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {slipped.length > 0 && (
        <div className="card pad" style={{ marginTop: 12, borderColor: '#F3C3CF' }}>
          <div className="lbl" style={{ color: 'var(--max-fg)' }}>Slipped</div>
          <div className="stack" style={{ gap: 8, marginTop: 8 }}>
            {slipped.map((t) => (
              <div key={t.id} className="between">
                <span style={{ fontWeight: 800 }}>
                  {t.title} {t.due_date && <span className="small muted">· due {fmtShort(t.due_date)}</span>}
                </span>
                <span className="row" style={{ gap: 6 }}>
                  <button className="chip" onClick={() => { updateTask(t.id, { today_date: addDays(t0, 1) }); showToast('On tomorrow'); }}>Tomorrow</button>
                  <button className="chip" onClick={() => { updateTask(t.id, { status: 'dropped', today_date: null }); showToast('Dropped'); }}>Drop</button>
                </span>
              </div>
            ))}
          </div>
          <div className="small muted" style={{ marginTop: 14 }}>Why did it slip?</div>
          <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {REASONS.map((r) => (
              <button key={r} className={`chip ${reason === r ? 'max on' : ''}`} style={{ height: 34 }} onClick={() => setReason(r)}>
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="field" style={{ marginTop: 16 }}>
        <span>One change for next week</span>
        <textarea className="input" style={{ minHeight: 90 }} value={change} onChange={(e) => setChange(e.target.value)} placeholder="e.g. Split big tasks into 2 h blocks. Protect Tuesday morning." />
      </label>
      <button
        className="btn block"
        style={{ marginTop: 14 }}
        onClick={() => {
          saveReview(ws, { slipped_reason: reason, change_note: change.trim() || null });
          showToast('Week closed. See you Monday.');
        }}
      >
        Close the week
      </button>
      {review && <p className="small muted" style={{ textAlign: 'center', marginTop: 10 }}>Saved for this week.</p>}
    </div>
  );
}
