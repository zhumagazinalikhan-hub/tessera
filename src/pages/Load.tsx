import { useStore } from '../data/store';
import { addDays, fmtHours, today, weekDays, weekdayShort } from '../lib/dates';
import { rebalance, weekLoad } from '../lib/logic';
import { PageHead } from '../components/ui';

export default function Load() {
  const { db, updateTask, showToast } = useStore();
  const load = weekLoad(db);
  const over = load.committedMin - load.capacityMin;
  const moves = rebalance(db);
  const t0 = today();
  const maxBar = Math.max(load.perDayCap * 1.5, ...load.perDay.map((p) => p.min), 1);
  const nextMon = addDays(weekDays(t0)[0], 7);
  const delegated = db.tasks.filter((t) => t.status === 'delegated');

  return (
    <div className="page">
      <PageHead
        over="This week"
        title="Load"
        sub={over > 0 ? `Over capacity by ${fmtHours(over)}. Move, hand off, or drop?` : `You are within capacity, with ${fmtHours(-over)} of Margin.`}
      />

      <div className="grid3" style={{ marginTop: 16 }}>
        <div className="card pad">
          <div className="lbl">Committed</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{fmtHours(load.committedMin)}</div>
        </div>
        <div className="card pad">
          <div className="lbl">Capacity</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{fmtHours(load.capacityMin)}</div>
        </div>
        <div className="card pad" style={over > 0 ? { background: 'var(--max-bg)', borderColor: '#F3C3CF' } : { background: 'var(--target-bg)' }}>
          <div className="lbl" style={{ color: over > 0 ? 'var(--max-fg)' : 'var(--target-fg)' }}>{over > 0 ? 'Over' : 'Margin'}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: over > 0 ? 'var(--max-fg)' : 'var(--target-fg)' }}>{fmtHours(Math.abs(over))}</div>
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 12 }}>
        <div className="lbl">Hours per day</div>
        <div style={{ position: 'relative', height: 180, marginTop: 12, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', borderBottom: '1.5px solid var(--border)' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: `${(load.perDayCap / maxBar) * 100}%`, borderTop: '1.5px dashed var(--muted)', opacity: 0.6 }} />
          <span className="small muted" style={{ position: 'absolute', right: 0, bottom: `calc(${(load.perDayCap / maxBar) * 100}% + 4px)` }}>
            {fmtHours(load.perDayCap)} cap
          </span>
          {load.perDay.map((p) => {
            const okPart = Math.min(p.min, load.perDayCap);
            const overPart = Math.max(0, p.min - load.perDayCap);
            return (
              <div key={p.date} style={{ width: 44, display: 'flex', flexDirection: 'column', alignItems: 'center' }} title={fmtHours(p.min)}>
                <span className="small" style={{ marginBottom: 4 }}>{Math.round(p.min / 60)}</span>
                {overPart > 0 && <div style={{ width: 34, height: `${(overPart / maxBar) * 160}px`, background: 'var(--crimson)', borderRadius: '10px 10px 0 0' }} />}
                <div style={{ width: 34, height: `${(okPart / maxBar) * 160}px`, background: 'var(--green)', borderRadius: overPart ? 0 : '10px 10px 0 0', opacity: p.date < t0 ? 0.45 : 1 }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 6 }}>
          {load.perDay.map((p) => (
            <span key={p.date} className="lbl" style={{ width: 44, textAlign: 'center', color: p.date === t0 ? 'var(--crimson)' : undefined }}>
              {weekdayShort(p.date)}
            </span>
          ))}
        </div>
      </div>

      <div className="card pad" style={{ marginTop: 12 }}>
        <div className="lbl">Where the hours go</div>
        <div className="bar" style={{ marginTop: 10 }}>
          <div style={{ flex: load.byQuadrant.do || 0.001, background: 'var(--crimson)' }} />
          <div style={{ flex: load.byQuadrant.schedule || 0.001, background: 'var(--green)' }} />
          <div style={{ flex: load.byQuadrant.delegate || 0.001, background: '#E5A23A' }} />
          <div style={{ flex: load.byQuadrant.drop || 0.001, background: '#A8999C' }} />
        </div>
        <div className="grid2" style={{ marginTop: 10, gap: 6 }}>
          {(
            [
              ['Do first', 'do', 'var(--crimson)'],
              ['Schedule', 'schedule', 'var(--green)'],
              ['Delegate', 'delegate', '#E5A23A'],
              ['Eliminate', 'drop', '#A8999C'],
            ] as const
          ).map(([l, k, c]) => (
            <div key={k} className="between small">
              <span className="row" style={{ gap: 8 }}>
                <i style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                {l}
              </span>
              <span className="muted">{fmtHours(load.byQuadrant[k])}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <span className="lbl">{over > 0 ? 'Suggested moves' : 'Clean-up ideas'}</span>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {moves.length === 0 && <div className="card pad small muted">Nothing to move. Enjoy the Margin.</div>}
        {moves.map((m) => (
          <div key={m.task.id + m.action} className="card item">
            <span className="grow">
              <span className="title" style={{ display: 'block' }}>{m.task.title}</span>
              <span className={`chip ${m.action === 'delegate' ? 'min' : m.action === 'later' ? 'target' : ''}`} style={{ marginTop: 4 }}>
                {m.action === 'delegate' ? 'Hand off' : m.action === 'later' ? 'Move to next week' : 'Drop'}
              </span>
            </span>
            <span style={{ fontWeight: 900 }}>−{fmtHours(m.saves)}</span>
            <button
              className="btn sm"
              onClick={() => {
                if (m.action === 'delegate') {
                  const who = window.prompt(`Hand off "${m.task.title}" to…`);
                  if (!who?.trim()) return;
                  updateTask(m.task.id, { status: 'delegated', delegated_to: who.trim(), today_date: null });
                } else if (m.action === 'later') updateTask(m.task.id, { due_date: m.task.due_date && m.task.due_date > nextMon ? m.task.due_date : nextMon, today_date: null, urgent: false });
                else updateTask(m.task.id, { status: 'dropped', today_date: null });
                showToast('Moved. Load updated.');
              }}
            >
              Apply
            </button>
          </div>
        ))}
      </div>

      {delegated.length > 0 && (
        <>
          <div className="section">
            <span className="lbl">Handed off</span>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {delegated.map((t) => (
              <div key={t.id} className="card item">
                <span className="tile" style={{ background: 'var(--min-bg)', color: 'var(--min-fg)', borderRadius: 20 }}>
                  {(t.delegated_to ?? '?').slice(0, 1).toUpperCase()}
                </span>
                <span className="grow">
                  <span className="title" style={{ display: 'block' }}>{t.title}</span>
                  <span className="meta">{t.delegated_to}</span>
                </span>
                <button className="chip target" onClick={() => updateTask(t.id, { status: 'done', done_at: new Date().toISOString() })}>
                  Mark done
                </button>
                <button className="chip" onClick={() => updateTask(t.id, { status: 'open', delegated_to: null })}>
                  Take back
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
