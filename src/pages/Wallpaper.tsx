import { useEffect, useRef, useState } from 'react';
import { useStore } from '../data/store';
import { addDays, fmtShort, today } from '../lib/dates';
import { loadAyahForDate } from '../lib/ayah';
import { drawWallpaper, ensureFonts } from '../lib/wallpaper';
import { newToken, renderJpeg, shortcutUrl, DAYS_AHEAD } from '../data/wallpaperSync';
import { syncNow, useSyncState } from '../data/useWallpaperSync';
import { PageHead } from '../components/ui';

const STEPS = [
  ['Open Shortcuts → New Shortcut', 'Name it “Tessera wallpaper”.'],
  ['Add “Current Date”', 'Then “Format Date” → Custom → format yyyy-MM-dd.'],
  ['Add “Text”', 'Paste your link below, then insert the Formatted Date right after it (no space).'],
  ['Add “Get Contents of URL”', 'Input: the Text from the step before.'],
  ['Add “Get Dictionary Value”', 'Get Value for key: fields.jpg.stringValue'],
  ['Add “Base64 Encode”', 'Tap it and switch the mode to Decode.'],
  ['Add “Set Name”', 'Name: wallpaper.jpg'],
  ['Add “Set Wallpaper”', 'Choose Lock Screen. Open its options and turn off Show Preview and Crop to Subject.'],
  ['Automation: Personal → Time of Day', '00:01, Daily → Run Immediately → choose the “Tessera wallpaper” shortcut.'],
];

export default function Wallpaper() {
  const { db, uid, mode, updateProfile, showToast } = useStore();
  const p = db.profile;
  const sync = useSyncState();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [day, setDay] = useState(today());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      await ensureFonts();
      const ayah = await loadAyahForDate(day, p.ayah_lang ?? 'en').catch(() => null);
      if (alive && canvas.current) drawWallpaper(canvas.current, { db, date: day, ayah });
    })();
    return () => {
      alive = false;
    };
  }, [db, day, p.ayah_lang]);

  const cloud = mode === 'firebase';
  const link = p.wallpaper_token ? shortcutUrl(p.wallpaper_token) : '';

  function enable() {
    const token = p.wallpaper_token ?? newToken();
    updateProfile({ wallpaper_enabled: true, wallpaper_token: token });
  }

  async function download() {
    const url = await renderJpeg(db, day);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tessera-${day}.jpg`;
    a.click();
  }

  return (
    <div className="page wide">
      <PageHead over="Lock screen" title="Wallpaper" sub="Your day on the lock screen: ayah, tasks, habits, month and a word. It updates every night at midnight." />

      <div style={{ display: 'flex', gap: 24, marginTop: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flexShrink: 0 }}>
          <canvas
            ref={canvas}
            style={{ width: 300, height: 650, borderRadius: 34, border: '8px solid #2A2025', background: '#000', display: 'block' }}
            aria-label={`Wallpaper preview for ${day}`}
          />
          <div className="row" style={{ justifyContent: 'center', gap: 8, marginTop: 10 }}>
            <button className="icon-btn" aria-label="Previous day" onClick={() => setDay(addDays(day, -1))} disabled={day <= today()}>
              ‹
            </button>
            <span className="small" style={{ minWidth: 110, textAlign: 'center' }}>
              {day === today() ? 'Today' : fmtShort(day)}
            </span>
            <button className="icon-btn" aria-label="Next day" onClick={() => setDay(addDays(day, 1))} disabled={day >= addDays(today(), DAYS_AHEAD - 1)}>
              ›
            </button>
          </div>
          <button className="btn ghost block" style={{ marginTop: 10 }} onClick={download}>
            Download this image
          </button>
        </div>

        <div style={{ flex: 1, minWidth: 280 }}>
          {!cloud ? (
            <div className="banner">Automatic updates need an account. Sign in to Tessera to turn them on. You can still download today's image.</div>
          ) : !p.wallpaper_enabled ? (
            <div className="card pad stack">
              <div style={{ fontWeight: 900, fontSize: 18 }}>Turn on daily wallpaper</div>
              <p className="sub" style={{ margin: 0 }}>
                Tessera draws the next {DAYS_AHEAD} days on this device and saves them to your account behind a private link. Your iPhone Shortcut downloads today's image at midnight.
              </p>
              <button className="btn" onClick={enable}>
                Turn on
              </button>
            </div>
          ) : (
            <>
              <div className="card pad stack" style={{ gap: 8 }}>
                <div className="between">
                  <span style={{ fontWeight: 900 }}>Daily wallpaper is on</span>
                  <span className={`chip ${sync.status === 'error' ? 'max' : sync.status === 'done' ? 'target' : ''}`}>
                    {sync.status === 'syncing' ? 'Updating…' : sync.status === 'done' ? 'Up to date' : sync.status === 'error' ? 'Not saved' : 'Waiting'}
                  </span>
                </div>
                <p className="small muted" style={{ margin: 0 }}>
                  The next {DAYS_AHEAD} days refresh whenever you open Tessera or change something. Open the app at least once a week.
                  {sync.error && <span style={{ color: 'var(--max-fg)' }}> Error: {sync.error}</span>}
                </p>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn sm" onClick={() => syncNow(db, uid, p.wallpaper_token!)} disabled={sync.status === 'syncing'}>
                    Update now
                  </button>
                  <button
                    className="btn sm ghost"
                    onClick={() => {
                      if (!window.confirm('Make a new private link? The old one stops working, so update your Shortcut.')) return;
                      updateProfile({ wallpaper_token: newToken() });
                    }}
                  >
                    New link
                  </button>
                  <button className="btn sm ghost" onClick={() => updateProfile({ wallpaper_enabled: false })}>
                    Turn off
                  </button>
                </div>
              </div>

              <div className="section">
                <span className="lbl">Your private link</span>
              </div>
              <div className="card pad">
                <code style={{ fontSize: 12, wordBreak: 'break-all', display: 'block' }}>{link}</code>
                <button
                  className="btn sm"
                  style={{ marginTop: 10 }}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link);
                      setCopied(true);
                      showToast('Link copied');
                    } catch {
                      showToast('Copy failed: select the link and copy it');
                    }
                  }}
                >
                  {copied ? 'Copied' : 'Copy link'}
                </button>
                <p className="small muted" style={{ margin: '10px 0 0' }}>Keep this link to yourself: anyone with it can see your wallpaper image.</p>
              </div>

              <div className="section">
                <span className="lbl">Set up on iPhone (once)</span>
              </div>
              <ol className="card pad stack" style={{ gap: 10, margin: 0, paddingLeft: 36 }}>
                {STEPS.map(([t, d]) => (
                  <li key={t}>
                    <div style={{ fontWeight: 900 }}>{t}</div>
                    <div className="small muted">{d}</div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
