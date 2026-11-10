import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../data/store';
import { today } from '../lib/dates';
import { loadAyahForDate, type Ayah, type AyahLang } from '../lib/ayah';

const T = {
  en: { title: 'Ayah of the day', open: 'Read tafsir', close: 'Hide tafsir', more: 'Read more', less: 'Show less', fail: "Couldn't load today's ayah.", retry: 'Try again', none: 'No tafsir for this ayah in the source.', tr: 'Translation', tf: 'Tafsir' },
  ru: { title: 'Аят дня', open: 'Читать тафсир', close: 'Скрыть тафсир', more: 'Читать дальше', less: 'Свернуть', fail: 'Не удалось загрузить аят.', retry: 'Повторить', none: 'Для этого аята в источнике нет тафсира.', tr: 'Перевод', tf: 'Тафсир' },
};

export default function AyahCard() {
  const { db, updateProfile } = useStore();
  const lang: AyahLang = db.profile.ayah_lang ?? 'en';
  const t = T[lang];
  const date = today();
  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [openTafsir, setOpenTafsir] = useState(false);
  const [full, setFull] = useState(false);

  const load = useCallback(() => {
    setState('loading');
    loadAyahForDate(date, lang)
      .then((a) => {
        setAyah(a);
        setState('ok');
      })
      .catch(() => setState('error'));
  }, [date, lang]);

  useEffect(load, [load]);

  const tafsir = ayah?.tafsir ?? '';
  const long = tafsir.length > 320;

  return (
    <section className="card" style={{ marginTop: 16, padding: '16px 18px', overflow: 'hidden' }} aria-label={t.title}>
      <div className="between">
        <span className="lbl" style={{ color: 'var(--crimson)' }}>{t.title}</span>
        <div className="row" style={{ gap: 6 }}>
          {ayah && (
            <span className="chip">
              {ayah.surahName} · {ayah.ref}
            </span>
          )}
          <div className="seg" style={{ padding: 2 }} role="radiogroup" aria-label="Language">
            {(['en', 'ru'] as const).map((l) => (
              <button
                key={l}
                role="radio"
                aria-checked={lang === l}
                className={lang === l ? 'on' : ''}
                style={{ height: 26, padding: '0 10px', fontSize: 12 }}
                onClick={() => updateProfile({ ayah_lang: l })}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {state === 'loading' && (
        <div aria-busy="true" style={{ marginTop: 14 }}>
          <div style={{ height: 30, borderRadius: 10, background: 'var(--track)', width: '80%', marginLeft: 'auto' }} />
          <div style={{ height: 14, borderRadius: 7, background: 'var(--track)', width: '90%', marginTop: 14 }} />
          <div style={{ height: 14, borderRadius: 7, background: 'var(--track)', width: '60%', marginTop: 8 }} />
        </div>
      )}

      {state === 'error' && (
        <div className="row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
          <span className="small muted">{t.fail}</span>
          <button className="btn sm ghost" onClick={load}>{t.retry}</button>
        </div>
      )}

      {state === 'ok' && ayah && (
        <>
          <p
            lang="ar"
            dir="rtl"
            style={{ margin: '14px 0 0', fontFamily: "'Amiri', 'Scheherazade New', serif", fontSize: 26, lineHeight: 1.9, textAlign: 'right' }}
          >
            {ayah.arabic}
          </p>
          <p lang={lang} style={{ margin: '10px 0 0', fontSize: 17, lineHeight: '26px', fontWeight: 700 }}>
            {ayah.translation}
          </p>

          <div className="between" style={{ marginTop: 12, flexWrap: 'wrap' }}>
            <span className="small muted">
              {t.tr}: {ayah.translationName}
              {ayah.tafsirName && ` · ${t.tf}: ${ayah.tafsirName}`}
            </span>
            <button className="link" onClick={() => setOpenTafsir(!openTafsir)} aria-expanded={openTafsir}>
              {openTafsir ? t.close : t.open}
            </button>
          </div>

          {openTafsir && (
            <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 20, background: 'var(--bg)' }}>
              {tafsir ? (
                <>
                  <p
                    lang={lang}
                    style={{
                      margin: 0,
                      fontSize: 15,
                      lineHeight: '24px',
                      fontWeight: 600,
                      whiteSpace: 'pre-line',
                      maxHeight: long && !full ? 168 : undefined,
                      overflow: 'hidden',
                      maskImage: long && !full ? 'linear-gradient(#000 70%, transparent)' : undefined,
                    }}
                  >
                    {tafsir}
                  </p>
                  {long && (
                    <button className="link" style={{ marginTop: 8 }} onClick={() => setFull(!full)}>
                      {full ? t.less : t.more}
                    </button>
                  )}
                </>
              ) : (
                <span className="small muted">{t.none}</span>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
