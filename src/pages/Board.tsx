import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../data/store';
import { QUADRANTS, quadrantOf, type Quadrant, type Task } from '../data/types';
import { fmtHours, fmtShort, today } from '../lib/dates';
import { openTasks, weekLoad } from '../lib/logic';
import { Icon, PageHead } from '../components/ui';
import TaskSheet from '../components/TaskSheet';

const COLORS: Record<Quadrant, string> = { do: 'var(--grad)', schedule: '#2E7D55', delegate: '#E5A23A', drop: '#A8999C' };

export default function Board() {
  const { db } = useStore();
  const [sheet, setSheet] = useState<{ task: Partial<Task>; isNew: boolean } | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const load = weekLoad(db);
  const open = openTasks(db);
  const closed = db.tasks.filter((t) => t.status !== 'open');
  const t0 = today();
  const over = load.committedMin - load.capacityMin;

  return (
    <div className="page wide">
      <PageHead
        over="This week"
        title="The Board"
        sub={`${open.length} open tasks · ${fmtHours(open.reduce((a, t) => a + t.estimate_min, 0))}`}
        right={
          <div className="row" style={{ gap: 8 }}>
            <Link to="/dump" className="btn sm ghost">
              <Icon name="spark" size={16} /> Brain dump
            </Link>
            <button className="btn sm" onClick={() => setSheet({ task: {}, isNew: true })}>
              <Icon name="plus" size={16} stroke={2.4} /> Task
            </button>
          </div>
        }
      />

      <div className="hero amber" style={{ marginTop: 16 }}>
        <div className="lbl">Load this week</div>
        <div className="big">
          {fmtHours(load.committedMin)} <span style={{ fontSize: 17, color: 'var(--plum-text)' }}>of {fmtHours(load.capacityMin)}</span>
        </div>
        <div className="bar" style={{ marginTop: 10, background: 'var(--plum-2)', maxWidth: 520 }}>
          <div style={{ width: `${Math.min(100, (load.committedMin / Math.max(load.committedMin, load.capacityMin)) * 100)}%`, background: over > 0 ? '#E04A68' : 'var(--green-bar)' }} />
        </div>
        <div className="row" style={{ marginTop: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span className="note">{over > 0 ? `Over capacity by ${fmtHours(over)}` : `${fmtHours(-over)} of Margin left`}</span>
          {over > 0 && (
            <Link to="/load" className="btn sm" style={{ boxShadow: 'none' }}>
              Rebalance
            </Link>
          )}
        </div>
      </div>

      <div className="quad-grid" style={{ marginTop: 16 }}>
        {QUADRANTS.map((q) => {
          const list = open.filter((t) => quadrantOf(t) === q.id);
          const min = list.reduce((a, t) => a + t.estimate_min, 0);
          return (
            <section key={q.id} className="card" style={{ padding: 14, minHeight: 180, display: 'flex', flexDirection: 'column' }} aria-label={q.title}>
              <div className="row">
                <span className="tile" style={{ background: COLORS[q.id] }}>
                  {list.length}
                </span>
                <div className="grow">
                  <div style={{ fontWeight: 900, fontSize: 17 }}>{q.title}</div>
                  <div className="small muted">{q.sub}</div>
                </div>
                <span className="chip">{fmtHours(min)}</span>
              </div>
              <div className="stack" style={{ gap: 6, marginTop: 10, flex: 1 }}>
                {list.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSheet({ task: t, isNew: false })}
                    className="between"
                    style={{ background: 'var(--bg)', border: 0, borderRadius: 14, padding: '9px 12px', textAlign: 'left' }}
                  >
                    <span style={{ fontWeight: 800, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.today_date === t0 && <span title="On Today" style={{ color: 'var(--crimson)' }}>● </span>}
                      {t.title}
                    </span>
                    <span className="small muted" style={{ flexShrink: 0 }}>
                      {t.due_date ? `${fmtShort(t.due_date)} · ` : ''}
                      {fmtHours(t.estimate_min)}
                    </span>
                  </button>
                ))}
                {list.length === 0 && <div className="small muted" style={{ padding: '6px 2px' }}>Nothing here.</div>}
              </div>
              <button
                className="link"
                style={{ alignSelf: 'flex-start', marginTop: 8, fontSize: 13 }}
                onClick={() => setSheet({ task: { urgent: q.urgent, important: q.important, kind: q.id === 'delegate' || q.id === 'drop' ? 'routine' : 'deep' }, isNew: true })}
              >
                + Add
              </button>
            </section>
          );
        })}
      </div>

      {closed.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <button className="link" onClick={() => setShowClosed(!showClosed)}>
            {showClosed ? 'Hide' : 'Show'} closed tasks ({closed.length})
          </button>
          {showClosed && (
            <div className="stack" style={{ gap: 6, marginTop: 10 }}>
              {closed.map((t) => (
                <button key={t.id} className="card item done" style={{ textAlign: 'left' }} onClick={() => setSheet({ task: t, isNew: false })}>
                  <span className="grow title">{t.title}</span>
                  <span className="chip">{t.status === 'delegated' ? `→ ${t.delegated_to}` : t.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {sheet && <TaskSheet task={sheet.task} isNew={sheet.isNew} onClose={() => setSheet(null)} />}
    </div>
  );
}
