import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../data/store';
import { QUADRANTS, quadrantOf, type Task } from '../data/types';
import { addDays, today } from '../lib/dates';
import { todayTasks } from '../lib/logic';
import { Modal } from './ui';

const ESTIMATES = [15, 30, 45, 60, 90, 120, 180, 240, 360, 480];

export default function TaskSheet({ task, onClose, isNew = false }: { task: Partial<Task>; onClose: () => void; isNew?: boolean }) {
  const { db, addTask, updateTask, deleteTask, showToast } = useStore();
  const nav = useNavigate();
  const [f, setF] = useState({
    title: task.title ?? '',
    urgent: task.urgent ?? false,
    important: task.important ?? true,
    estimate_min: task.estimate_min ?? 60,
    due_date: task.due_date ?? '',
    kind: task.kind ?? ('deep' as const),
    min_note: task.min_note ?? '',
  });
  const [delegate, setDelegate] = useState(task.delegated_to ?? '');
  const q = quadrantOf(f);
  const t0 = today();
  const inToday = task.today_date === t0;
  const slots = 3 - todayTasks(db).filter((t) => t.status === 'open').length;

  const fields = () => ({ ...f, title: f.title.trim(), due_date: f.due_date || null, min_note: f.min_note.trim() || null });

  function save(extra: Partial<Task> = {}, msg?: string) {
    if (!f.title.trim()) return;
    if (isNew) addTask({ ...fields(), ...extra });
    else updateTask(task.id!, { ...fields(), ...extra });
    if (msg) showToast(msg);
    onClose();
  }

  const todayPatch = (): Partial<Task> => ({ today_date: t0, today_order: todayTasks(db).length });

  return (
    <Modal title={isNew ? 'New task' : 'Task'} onClose={onClose}>
      <div className="stack" style={{ gap: 14 }}>
        <label className="field">
          <span>Task</span>
          <input className="input" autoFocus={isNew} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="What needs doing?" />
        </label>
        <div className="field">
          <span>Box</span>
          <div className="grid2" style={{ gap: 8 }}>
            {QUADRANTS.map((x) => (
              <button
                key={x.id}
                type="button"
                className="card"
                aria-pressed={q === x.id}
                onClick={() => setF({ ...f, urgent: x.urgent, important: x.important })}
                style={{ padding: '10px 12px', textAlign: 'left', borderColor: q === x.id ? 'var(--crimson)' : undefined, background: q === x.id ? 'var(--max-bg)' : undefined, boxShadow: 'none' }}
              >
                <div style={{ fontWeight: 900 }}>{x.title}</div>
                <div className="small muted">{x.sub}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="grid2">
          <label className="field">
            <span>Time</span>
            <select className="input" value={f.estimate_min} onChange={(e) => setF({ ...f, estimate_min: Number(e.target.value) })}>
              {[...new Set([...ESTIMATES, f.estimate_min])].sort((a, b) => a - b).map((m) => (
                <option key={m} value={m}>
                  {m < 60 ? `${m} min` : `${m / 60} h`}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Due</span>
            <input className="input" type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} />
          </label>
        </div>
        <div className="field">
          <span>Type</span>
          <div className="seg">
            <button type="button" className={f.kind === 'deep' ? 'on' : ''} onClick={() => setF({ ...f, kind: 'deep' })}>
              Deep work
            </button>
            <button type="button" className={f.kind === 'routine' ? 'on' : ''} onClick={() => setF({ ...f, kind: 'routine' })}>
              Routine
            </button>
          </div>
        </div>
        <label className="field">
          <span>Min version (for rough days)</span>
          <input className="input" value={f.min_note} onChange={(e) => setF({ ...f, min_note: e.target.value })} placeholder="e.g. Draft section 1 · 30 min" />
        </label>

        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => save()} disabled={!f.title.trim()}>
            Save
          </button>
          {!inToday && (
            <button className="btn ghost" style={{ flex: 1 }} disabled={!f.title.trim() || slots <= 0} onClick={() => save(todayPatch(), 'Added to Today')}>
              {slots > 0 ? 'Save + add to Today' : 'Today is full (3)'}
            </button>
          )}
        </div>

        {!isNew && task.status === 'open' && (
          <div className="card pad stack" style={{ gap: 10 }}>
            <div className="lbl">Actions</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <button className="btn sm ghost" onClick={() => { save(); nav(`/focus/${task.id}`); }}>Focus now</button>
              {inToday && <button className="btn sm ghost" onClick={() => save({ today_date: addDays(t0, 1) }, 'Moved to tomorrow')}>Move to tomorrow</button>}
              {inToday && <button className="btn sm ghost" onClick={() => save({ today_date: null, today_order: null }, 'Back on the Board')}>Remove from Today</button>}
              <button className="btn sm ghost" onClick={() => save({ status: 'done', done_at: new Date().toISOString(), done_level: 'target' }, 'Done')}>Mark done</button>
              <button className="btn sm ghost" onClick={() => save({ status: 'dropped', today_date: null }, 'Dropped. One less thing.')}>Drop</button>
            </div>
            <div className="row">
              <input className="input" style={{ height: 40 }} placeholder="Hand off to…" value={delegate} onChange={(e) => setDelegate(e.target.value)} />
              <button className="btn sm" disabled={!delegate.trim()} onClick={() => save({ status: 'delegated', delegated_to: delegate.trim(), today_date: null }, `Handed off to ${delegate.trim()}`)}>
                Hand off
              </button>
            </div>
          </div>
        )}
        {!isNew && task.status !== 'open' && (
          <button className="btn ghost" onClick={() => save({ status: 'open', done_at: null, done_level: null, delegated_to: null }, 'Reopened')}>
            Reopen task
          </button>
        )}
        {!isNew && (
          <button
            className="link"
            style={{ color: 'var(--muted)', alignSelf: 'center' }}
            onClick={() => {
              deleteTask(task.id!);
              showToast('Task deleted');
              onClose();
            }}
          >
            Delete task
          </button>
        )}
      </div>
    </Modal>
  );
}
