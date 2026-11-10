import { fromISO } from './dates';

// Ayah of the day: a short curated list of references only.
// The Arabic text, translation and tafsir are always loaded from published sources,
// never typed by hand.
export const AYAH_REFS = [
  '2:286', // no soul is burdened beyond its capacity
  '94:5',
  '94:6',
  '94:7',
  '65:3',
  '13:28',
  '2:153',
  '3:139',
  '39:53',
  '2:186',
  '29:69',
  '53:39',
  '20:114',
  '62:10',
  '3:159',
  '18:23',
  '4:28',
];

export type AyahLang = 'en' | 'ru';

const TRANSLATION: Record<AyahLang, { id: string; name: string }> = {
  en: { id: 'en.sahih', name: 'Sahih International' },
  ru: { id: 'ru.kuliev', name: 'Э. Кулиев' },
};

// First edition that has text for the ayah wins.
const TAFSIR: Record<AyahLang, { slug: string; name: string }[]> = {
  en: [
    { slug: 'en-tafsir-al-mukhtasar', name: 'Al-Mukhtasar' },
    { slug: 'en-al-jalalayn', name: 'Al-Jalalayn' },
    { slug: 'en-tafisr-ibn-kathir', name: 'Ibn Kathir' },
  ],
  ru: [
    { slug: 'russian-mokhtasar', name: 'Аль-Мухтасар' },
    { slug: 'ru-tafseer-al-saddi', name: 'Ас-Саади' },
  ],
};

export interface Ayah {
  ref: string;
  surahName: string; // transliterated, e.g. Al-Baqarah
  surahArabic: string;
  arabic: string;
  translation: string;
  translationName: string;
  tafsir: string | null;
  tafsirName: string | null;
}

export function ayahRefFor(date: string): string {
  const day = Math.floor(fromISO(date).getTime() / 86400000);
  return AYAH_REFS[((day % AYAH_REFS.length) + AYAH_REFS.length) % AYAH_REFS.length];
}

function clean(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function loadTafsir(ref: string, lang: AyahLang): Promise<{ text: string; name: string } | null> {
  const [s, a] = ref.split(':');
  for (const ed of TAFSIR[lang]) {
    try {
      const r = await fetch(`https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/${ed.slug}/${s}/${a}.json`);
      if (!r.ok) continue;
      const j = (await r.json()) as { text?: string; content?: string };
      const raw = j.text ?? j.content ?? '';
      const text = raw ? clean(raw) : '';
      if (text.length > 20) return { text, name: ed.name };
    } catch {
      /* try the next edition */
    }
  }
  return null;
}

export async function loadAyah(ref: string, lang: AyahLang): Promise<Ayah> {
  const key = `tessera.ayah.${ref}.${lang}`;
  try {
    const hit = localStorage.getItem(key);
    if (hit) return JSON.parse(hit) as Ayah;
  } catch {
    /* no cache */
  }
  const tr = TRANSLATION[lang];
  const [res, tafsir] = await Promise.all([fetch(`https://api.alquran.cloud/v1/ayah/${ref}/editions/quran-uthmani,${tr.id}`), loadTafsir(ref, lang)]);
  if (!res.ok) throw new Error(`Quran API ${res.status}`);
  const body = (await res.json()) as {
    data: { text: string; edition: { identifier: string }; surah: { name: string; englishName: string } }[];
  };
  const ar = body.data.find((d) => d.edition.identifier === 'quran-uthmani');
  const tx = body.data.find((d) => d.edition.identifier === tr.id);
  if (!ar || !tx) throw new Error('Ayah not found');
  const ayah: Ayah = {
    ref,
    surahName: ar.surah.englishName,
    surahArabic: ar.surah.name,
    arabic: ar.text,
    translation: tx.text,
    translationName: tr.name,
    tafsir: tafsir?.text ?? null,
    tafsirName: tafsir?.name ?? null,
  };
  try {
    localStorage.setItem(key, JSON.stringify(ayah));
  } catch {
    /* cache is optional */
  }
  return ayah;
}
