import { useStore } from '../data/store';
import { LEVEL_LABEL, type Level, type Profile } from '../data/types';
import { LevelSwitch, PageHead } from '../components/ui';

export default function Settings() {
  const { db, mode, email, updateProfile, loadSample, resetAll, signOut, showToast } = useStore();
  const p = db.profile;
  const set = (patch: Partial<Profile>) => updateProfile(patch);

  function exportData() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tessera-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <PageHead over={mode === 'cloud' ? email ?? 'Signed in' : 'Demo mode · saved in this browser'} title="Settings" sub="Your week, your rules." />

      <div className="section"><span className="lbl">You</span></div>
      <div className="card pad stack" style={{ gap: 14 }}>
        <label className="field">
          <span>Name</span>
          <input className="input" defaultValue={p.display_name} onBlur={(e) => set({ display_name: e.target.value.trim() })} />
        </label>
      </div>

      <div className="section"><span className="lbl">Your time</span></div>
      <div className="card pad stack" style={{ gap: 14 }}>
        <label className="field">
          <span>Focused hours per week · {p.weekly_capacity_h} h</span>
          <input type="range" min={10} max={50} value={p.weekly_capacity_h} onChange={(e) => set({ weekly_capacity_h: Number(e.target.value) })} style={{ accentColor: '#C93352' }} />
        </label>
        <div className="grid2">
          <label className="field">
            <span>Work starts</span>
            <input className="input" type="time" value={p.work_start} onChange={(e) => set({ work_start: e.target.value })} />
          </label>
          <label className="field">
            <span>Work ends</span>
            <input className="input" type="time" value={p.work_end} onChange={(e) => set({ work_end: e.target.value })} />
          </label>
        </div>
        <div className="field">
          <span>Deep work window</span>
          <div className="seg">
            {(['morning', 'afternoon'] as const).map((f) => (
              <button key={f} className={p.focus_window === f ? 'on' : ''} onClick={() => set({ focus_window: f })}>
                {f === 'morning' ? 'Mornings' : 'Afternoons'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="section"><span className="lbl">Levels and look</span></div>
      <div className="card pad stack" style={{ gap: 14 }}>
        <div className="field">
          <span>Default day level · {LEVEL_LABEL[p.default_level]}</span>
          <LevelSwitch value={p.default_level} onChange={(l: Level) => set({ default_level: l })} label="Default day level" />
        </div>
        <label className="between" style={{ cursor: 'pointer' }}>
          <span style={{ fontWeight: 800 }}>Ayah of the day on Today</span>
          <input type="checkbox" checked={p.show_ayah} onChange={(e) => set({ show_ayah: e.target.checked })} style={{ width: 22, height: 22, accentColor: '#C93352' }} />
        </label>
        {p.show_ayah && (
          <div className="field">
            <span>Ayah language</span>
            <div className="seg">
              {(['en', 'ru'] as const).map((l) => (
                <button key={l} className={p.ayah_lang === l ? 'on' : ''} onClick={() => set({ ayah_lang: l })}>
                  {l === 'en' ? 'English' : 'Русский'}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="field">
          <span>Theme</span>
          <div className="seg">
            {(['light', 'dark', 'auto'] as const).map((t) => (
              <button key={t} className={p.theme === t ? 'on' : ''} onClick={() => set({ theme: t })}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="section"><span className="lbl">Data</span></div>
      <div className="card pad stack" style={{ gap: 10 }}>
        {mode === 'demo' && (
          <div className="banner">
            Demo mode: your data lives only in this browser. Connect Supabase (see README) to sync across devices.
          </div>
        )}
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button className="btn sm ghost" onClick={exportData}>Export JSON</button>
          {db.tasks.length === 0 && <button className="btn sm ghost" onClick={loadSample}>Load sample week</button>}
          <button
            className="btn sm ghost"
            onClick={async () => {
              if (!window.confirm('Delete all tasks, habits and history? This cannot be undone.')) return;
              await resetAll();
              showToast('Everything cleared');
            }}
          >
            Delete all data
          </button>
          {mode === 'cloud' && <button className="btn sm dark" onClick={signOut}>Sign out</button>}
        </div>
      </div>
      <p className="small muted" style={{ textAlign: 'center', marginTop: 20 }}>Tessera web · v0.1</p>
    </div>
  );
}
