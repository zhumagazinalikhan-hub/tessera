import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../data/store';
import { LEVEL_LABEL, QUADRANTS, quadrantOf, type Habit, type Level, type Task } from '../data/types';
import { addDays, fmtDay, fmtHours, fmtShort, today } from '../lib/dates';
import { labelFor, leftovers, levelOn, minutesForLevel, openTasks, streak, todayTasks, weekLoad } from '../lib/logic';
import { Check, Icon, LevelChip, LevelSwitch, Modal } from '../components/ui';
import TaskSheet from '../components/TaskSheet';
import AyahCard from '../components/AyahCard';

export default function Today() {
  const store = useStore();
  const { db, setDay, dayLevel, updateTask, checkIn, showToast } = store;
  const nav = useNavigate();
  const t0 = today();
  const level = dayLevel(t0);
  const log = db.dayLogs.find((d) => d.date === t0);
  const tasks = todayTasks(db);
  const open = tasks.filter((t) => t.status === 'open');
  const late = leftovers(db);
  const habits = db.habits.filter((h) => !h.archived);
  const doneHabits = habits.filter((h) => levelOn(db.checkins, h.id, t0)).length;
  const planned = open.reduce((a, t) => a + minutesForLevel(t, level), 0);
  const cap = weekLoad(db).perDayCap;
  const [sheet, setSheet] = useState<Task | null>(null);
  const [picking, setPicking] = useState(false);

  // First visit of the morning goes to the morning screen.
  useEffect(() => {
    const key = `tessera.morning.${t0}`;
    let seen = true;
    try {
      seen = sessionStorage.getItem(key) === '1';
      sessionStorage.setItem(key, '1');
    } catch {
      /* ignore */
    }
    if (!log && !seen && new Date().getHours() < 12) nav('/morning');
  }, [log, nav, t0]);

  function toggleDone(t: Task) {
    if (t.status === 'done') updateTask(t.id, { status: 'open', done_at: null, done_level: null });
    else {
      updateTask(t.id, { status: 'done', done_at: new Date().toISOString(), done_level: level });
      showToast(`Done at ${LEVEL_LABEL[level]}. Counted.`);
    }
  }

  function addToToday(t: Task) {
    updateTask(t.id, { today_date: t0, today_order: tasks.length });
    setPicking(false);
  }

  const name = db.profile.display_name;
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page">
      <div className="between" style={{ alignItems: 'flex-start' }}>
        <div>
          <div className="lbl">{fmtDay(t0)}</div>
          <h1 className="h1">Today</h1>
          <p className="sub">
            {greet}
            {name ? `, ${name}` : ''}. Three things. The rest can wait.
          </p>
        </div>
        <Link to="/morning" className="icon-btn" aria-label="Morning check-in" title="Morning check-in">
          <Icon name="sun" size={20} />
        </Link>
      </div>

      {db.profile.show_ayah && <AyahCard />}

      <div className="hero" style={{ marginTop: 16 }}>
        <div className="between" style={{ marginBottom: 10 }}>
          <span className="lbl">Day level</span>
          <span style={{ fontSize: 13, fontWeight: 800 }}>One tap sets tasks and habits</span>
        </div>
        <LevelSwitch value={level} onChange={(l) => setDay(t0, { level: l })} label="Day level" />
        <div className="note" style={{ marginTop: 10 }}>
          Tasks {fmtHours(planned)} of {fmtHours(cap)} · habits {doneHabits} of {habits.length}
          {level === 'min' && ' · rough-day mode: everything at its floor'}
        </div>
      </div>

      {planned > cap && (
        <div className="banner" style={{ marginTop: 12 }}>
          Today is {fmtHours(planned - cap)} over your daily capacity. Try Min, or move one task to tomorrow.
        </div>
      )}

      {late.length > 0 && (
        <div className="card pad" style={{ marginTop: 12, borderColor: '#F3C3CF' }}>
          <div className="lbl" style={{ color: 'var(--max-fg)' }}>
            {late.length} unfinished from earlier
          </div>
          <div className="stack" style={{ marginTop: 8, gap: 8 }}>
            {late.map((t) => (
              <div key={t.id} className="between">
                <span style={{ fontWeight: 800 }}>
                  {t.title} <span className="small muted">· {fmtShort(t.today_date!)}</span>
                </span>
                <span className="row" style={{ gap: 6 }}>
                  <button className="chip" onClick={() => updateTask(t.id, { today_date: t0, today_order: tasks.length })} disabled={open.length >= 3}>
                    Today
                  </button>
                  <button className="chip" onClick={() => updateTask(t.id, { today_date: addDays(t0, 1) })}>
                    Tomorrow
                  </button>
                  <button className="chip" onClick={() => updateTask(t.id, { today_date: null, today_order: null })}>
                    Board
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <span className="lbl">Tasks</span>
        <Link to="/board" className="link">
          Board
        </Link>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {tasks.map((t, i) => (
          <div key={t.id} className={`card item ${t.status === 'done' ? 'done' : ''}`}>
            <Check on={t.status === 'done'} onClick={() => toggleDone(t)} label={`Mark ${t.title} done`} />
            <span className="tile" aria-hidden="true">
              {i + 1}
            </span>
            <button className="grow" style={{ background: 'none', border: 0, textAlign: 'left', padding: 0 }} onClick={() => setSheet(t)}>
              <div className="title">{t.title}</div>
              <div className="meta">
                {level === 'min' && t.min_note && t.status === 'open' ? `Min: ${t.min_note}` : fmtHours(t.estimate_min)}
                {t.due_date && ` · due ${t.due_date === t0 ? 'today' : fmtShort(t.due_date)}`}
              </div>
            </button>
            {t.status === 'open' ? (
              <Link to={`/focus/${t.id}`} className="icon-btn" aria-label={`Focus on ${t.title}`} style={{ background: 'var(--max-bg)', borderColor: 'transparent', color: 'var(--crimson)' }}>
                <Icon name="play" size={16} stroke={2.4} />
              </Link>
            ) : (
              <LevelChip level={t.done_level} />
            )}
          </div>
        ))}
        {open.length < 3 && (
          <button className="card item" style={{ borderStyle: 'dashed', boxShadow: 'none', justifyContent: 'center', fontWeight: 800, color: 'var(--muted)' }} onClick={() => setPicking(true)}>
            <Icon name="plus" size={18} /> Pick {tasks.length === 0 ? "today's three" : `${3 - open.length} more`} from your Board
          </button>
        )}
      </div>

      <div className="section">
        <span className="lbl">Habits</span>
        <Link to="/habits" className="link">
          {doneHabits} of {habits.length} done
        </Link>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {habits.map((h) => (
          <HabitRow key={h.id} habit={h} dayLevel={level} />
        ))}
        {habits.length === 0 && (
          <Link to="/habits/new" className="card item" style={{ borderStyle: 'dashed', boxShadow: 'none', justifyContent: 'center', fontWeight: 800, color: 'var(--muted)' }}>
            <Icon name="plus" size={18} /> Add your first habit
          </Link>
        )}
      </div>

      {level !== 'min' && habits.length > 0 && doneHabits < habits.length && (
        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <button className="link" onClick={() => setDay(t0, { level: 'min' })}>
            Rough day? Switch everything to Min
          </button>
        </p>
      )}

      {sheet && <TaskSheet task={sheet} onClose={() => setSheet(null)} />}
      {picking && (
        <Modal title="Pick for today" onClose={() => setPicking(false)}>
          <Picker onPick={addToToday} />
        </Modal>
      )}
    </div>
  );

  function HabitRow({ habit, dayLevel: dl }: { habit: Habit; dayLevel: Level }) {
    const lv = levelOn(db.checkins, habit.id, t0);
    const s = streak(db.checkins, habit.id);
    return (
      <div className="card" style={{ padding: '12px 14px' }}>
        <div className="row">
          <Check on={!!lv} onClick={() => checkIn(habit.id, t0, lv ? null : dl)} label={`Check in ${habit.name}`} />
          <Link to={`/habits/${habit.id}`} className="grow">
            <div style={{ fontSize: 16, fontWeight: 900 }}>{habit.name}</div>
            <div className="small muted">{labelFor(habit, lv ?? dl)}</div>
          </Link>
          <span className="chip">{s} {s === 1 ? 'day' : 'days'}</span>
        </div>
        <div style={{ marginTop: 10 }}>
          <LevelSwitch value={lv} onChange={(l) => checkIn(habit.id, t0, l === lv ? null : l)} label={`${habit.name} level`} />
        </div>
      </div>
    );
  }

  function Picker({ onPick }: { onPick: (t: Task) => void }) {
    const cands = openTasks(db).filter((t) => t.today_date !== t0);
    const order = ['do', 'schedule', 'delegate', 'drop'];
    cands.sort((a, b) => order.indexOf(quadrantOf(a)) - order.indexOf(quadrantOf(b)) || (a.due_date ?? '9').localeCompare(b.due_date ?? '9'));
    if (!cands.length)
      return (
        <div className="empty">
          <p className="sub">Your Board is empty.</p>
          <Link to="/dump" className="btn" style={{ marginTop: 12 }}>
            Brain dump
          </Link>
        </div>
      );
    return (
      <div className="stack" style={{ gap: 8 }}>
        {cands.map((t) => (
          <button key={t.id} className="card item" style={{ textAlign: 'left' }} onClick={() => onPick(t)}>
            <span className="grow">
              <span className="title" style={{ display: 'block' }}>{t.title}</span>
              <span className="meta">
                {QUADRANTS.find((q) => q.id === quadrantOf(t))!.title} · {fmtHours(t.estimate_min)}
                {t.due_date && ` · due ${fmtShort(t.due_date)}`}
              </span>
            </span>
            <Icon name="plus" size={18} />
          </button>
        ))}
      </div>
    );
  }
}
