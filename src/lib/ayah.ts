import { fromISO } from './dates';

// Ayah of the day: a curated list of verse references only (179 verses).
// The Arabic text, translation and tafsir are always loaded from published sources,
// never typed by hand. One verse per calendar day (changes at local midnight);
// verses too long for the card are skipped to the next one.
export const AYAH_REFS = [
  '87:15', '20:27', '15:99', '11:115', '8:46', '33:41', '29:57', '31:19', '65:7', '2:186',
  '20:25', '3:190', '89:29', '47:7', '21:87', '2:45', '61:2', '26:83', '16:18', '7:23',
  '62:9', '42:43', '26:80', '94:6', '2:155', '7:205', '20:28', '51:56', '10:57', '57:23',
  '12:86', '35:2', '1:5', '108:1', '112:4', '40:44', '23:1', '99:7', '28:24', '18:46',
  '61:3', '96:1', '64:11', '20:132', '62:10', '6:162', '23:3', '94:7', '9:105', '112:1',
  '6:163', '41:30', '29:2', '41:34', '16:127', '4:110', '49:10', '14:41', '25:63', '108:2',
  '20:46', '3:92', '2:153', '23:118', '99:8', '31:17', '14:7', '55:13', '2:152', '28:88',
  '15:98', '33:42', '33:56', '27:19', '11:6', '2:201', '23:2', '17:82', '76:9', '87:14',
  '2:216', '53:39', '53:41', '94:1', '21:89', '13:28', '30:60', '55:26', '95:4', '20:114',
  '33:21', '25:74', '2:156', '41:35', '18:23', '3:173', '94:4', '30:21', '3:191', '16:97',
  '19:65', '59:19', '96:19', '21:107', '67:2', '93:4', '103:2', '12:87', '18:24', '20:26',
  '50:16', '21:35', '2:286', '53:40', '55:27', '27:62', '94:5', '89:27', '93:5', '112:3',
  '64:16', '17:36', '49:13', '93:7', '17:80', '11:114', '31:18', '39:53', '55:60', '16:90',
  '89:30', '3:134', '103:3', '29:69', '15:49', '4:147', '14:40', '22:77', '7:56', '65:3',
  '9:129', '94:8', '21:83', '9:51', '73:8', '3:8', '16:128', '110:3', '112:2', '93:3',
  '87:17', '93:11', '103:1', '17:24', '7:199', '84:6', '3:133', '39:10', '70:5', '4:28',
  '18:10', '3:139', '39:9', '40:60', '3:200', '2:263', '16:125', '59:18', '3:104', '89:28',
  '29:45', '4:86', '65:2', '3:160', '3:31', '97:3', '33:3', '10:62', '23:115',
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

/** Longest Arabic text (characters) that fits the card and the wallpaper. */
export const AYAH_MAX_CHARS = 170;

function dayIndex(date: string): number {
  const day = Math.floor(fromISO(date).getTime() / 86400000);
  return ((day % AYAH_REFS.length) + AYAH_REFS.length) % AYAH_REFS.length;
}

/** The ayah for a calendar day: the date's verse, or the next short-enough one. */
export async function loadAyahForDate(date: string, lang: AyahLang): Promise<Ayah> {
  const start = dayIndex(date);
  let last: Ayah | null = null;
  for (let i = 0; i < 6; i++) {
    const ref = AYAH_REFS[(start + i) % AYAH_REFS.length];
    try {
      const a = await loadAyah(ref, lang);
      last = a;
      if (a.arabic.length <= AYAH_MAX_CHARS) return a;
    } catch (e) {
      if (i === 5 && !last) throw e;
    }
  }
  if (last) return last;
  throw new Error('No ayah available');
}
