import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../data/store';
import { QUADRANTS, quadrantOf } from '../data/types';
import { fmtHours, fmtShort } from '../lib/dates';
import { smartSort, type Parsed } from '../lib/logic';
import { Icon, PageHead } from '../components/ui';

const EXAMPLE = `Q4 report to finance today!!
Contract review before Wednesday
Client demo Friday 6h
Answer vendor emails
Chase invoices
Plan Q1 priorities
Clean up old folders
Unsubscribe from news feeds`;

export default function Dump() {
  const { addTasks, showToast } = useStore();
  const nav = useNavigate();
  const [text, setText] = useState('');
  const [items, setItems] = useState<Parsed[] | null>(null);

  function sort() {
    const out = smartSort(text);
    setItems(out.length ? out : null);
    if (!out.length) showToast('Write a few tasks first');
  }

  function save() {
    if (!items) return;
    addTasks(items.filter((i) => i.title));
    showToast(`${items.length} tasks added to your Board`);
    nav('/board');
  }

  const total = items?.reduce((a, i) => a + i.estimate_min, 0) ?? 0;

  return (
    <div className="page">
      <PageHead over="Brain dump" title={items ? `Sorted. ${items.length} tasks` : 'Dump everything.'} sub={items ? `${fmtHours(total)} in total. Tap a box to change it.` : 'One task per line, the way it is in your head. Words like "today", "Friday" or "2h" are understood.'} />

      {!items ? (
        <>
          <textarea
            className="input"
            style={{ marginTop: 18, minHeight: 260 }}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={EXAMPLE}
            aria-label="Your tasks, one per line"
          />
          <div className="row" style={{ marginTop: 14, gap: 10 }}>
            <button className="btn" style={{ flex: 1 }} onClick={sort} disabled={!text.trim()}>
              <Icon name="spark" size={18} /> Sort my list
            </button>
            {!text && (
              <button className="btn ghost" onClick={() => setText(EXAMPLE)}>
                Try an example
              </button>
            )}
          </div>
          <p className="small muted" style={{ marginTop: 12 }}>
            Sorting runs on your device with simple rules: deadlines make a task urgent, work words make it important, admin goes to Delegate, noise to Eliminate.
          </p>
        </>
      ) : (
        <>
          <div className="stack" style={{ marginTop: 18, gap: 8 }}>
            {items.map((it, i) => {
              const q = quadrantOf(it);
              return (
                <div key={i} className="card" style={{ padding: '12px 14px' }}>
                  <div className="between">
                    <input
                      className="input"
                      style={{ height: 38, border: 0, padding: 0, fontWeight: 900, background: 'transparent' }}
                      value={it.title}
                      onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                      aria-label="Task title"
                    />
                    <button className="icon-btn" aria-label="Remove" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {QUADRANTS.map((x) => (
                      <button
                        key={x.id}
                        className={`chip ${q === x.id ? 'max on' : ''}`}
                        onClick={() => setItems(items.map((y, j) => (j === i ? { ...y, urgent: x.urgent, important: x.important } : y)))}
                      >
                        {x.title}
                      </button>
                    ))}
                    <span className="chip target">{fmtHours(it.estimate_min)}</span>
                    {it.due_date && <span className="chip min">due {fmtShort(it.due_date)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="row" style={{ marginTop: 16, gap: 10 }}>
            <button className="btn ghost" onClick={() => setItems(null)}>
              Edit list
            </button>
            <button className="btn" style={{ flex: 1 }} onClick={save}>
              Put on my Board
            </button>
          </div>
        </>
      )}
    </div>
  );
}
