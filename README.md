# Tessera · web

Tasks and habits on one method: every task and habit has a **Min**, a **100%** and a **Max**.

Built with React 19, TypeScript and Vite. Accounts and sync: Firebase (Auth + Firestore), or Supabase as an alternative.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

The app is connected to the **tessera-5216d** Firebase project (config in `src/data/firebase.config.ts`). Run `VITE_DEMO=1 npm run dev` for **demo mode**: no sign-in, and data stays in this browser (localStorage).

## Connect Firebase (accounts + sync)

1. In the Firebase console: **Authentication → Sign-in method**, enable **Email/Password** and **Google**.
2. **Firestore Database → Create database** (production mode).
3. **Firestore → Rules**: paste `firestore.rules` from this repo and publish.
4. **Authentication → Settings → Authorized domains**: add `localhost` and `<user>.github.io`.
5. **Project settings → Your apps → Web**: copy the config into `.env.local` (see `.env.example`), or into GitHub secrets with the same names for the deployed site.

Data lives at `users/{uid}` (profile) and `users/{uid}/{tasks,habits,checkins,dayLogs,sessions,reviews}`. Firestore's offline cache keeps the app usable without a connection.

## Connect Supabase instead (alternative)

1. Create a project at supabase.com.
2. Open **SQL Editor** and run `supabase/migrations/0001_init.sql`, then `0002_ayah.sql`
   (or `supabase db push` with the Supabase CLI).
3. Copy `.env.example` to `.env.local` and fill in:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-key
   ```
4. In **Authentication → URL configuration**, add your site URL (for example `http://localhost:5173`).
5. Restart `npm run dev`. The app now asks to sign in, and each user only sees their own rows (row-level security).

## Deploy

**Firebase Hosting (main site): https://tessera-5216d.web.app** — `.github/workflows/firebase-hosting.yml` deploys every push to `main`. It needs one repository secret, `FIREBASE_SERVICE_ACCOUNT`: the JSON from Firebase console → Project settings → Service accounts → Generate new private key.


**GitHub Pages (set up):** every push to `main` builds and publishes the site with `.github/workflows/deploy.yml`. One-time step: repo **Settings → Pages → Source: GitHub Actions**. The site appears at `https://<user>.github.io/<repo>/`. To turn on Firebase there, add the six `VITE_FIREBASE_*` values under **Settings → Secrets and variables → Actions**.

**Other hosts:** 
`npm run build` produces `dist/`. It deploys as a static site to Vercel (`vercel.json` included) or Netlify (`public/_redirects` included). Set the two `VITE_SUPABASE_*` variables in the host's settings.

## What is inside

| Screen | Route | What it does |
| --- | --- | --- |
| Welcome + tour + setup | first run | Explains Min · 100% · Max, asks for weekly capacity and work hours, optional sample week |
| Morning | `/morning` | Line of the day, yesterday's result, energy check-in that suggests the day level |
| Today | `/` | Ayah of the day (Arabic, translation, tafsir; EN or RU), one day level for everything, today's three tasks, habits with one-tap check-in, leftovers from earlier days |
| Board | `/board` | Eisenhower matrix: Do first, Schedule, Delegate, Eliminate; task editor with hand-off, drop, Min version |
| Brain dump | `/dump` | Paste a messy list; rule-based sorting finds deadlines, time estimates and the right box |
| Load | `/load` | Week capacity vs committed hours, per-day chart, suggested moves, handed-off tasks |
| Focus | `/focus/:id` | Timer that survives reloads; finish by choosing the level you reached |
| Habits | `/habits`, `/habits/new`, `/habits/:id` | 14-day dots, streaks (Min counts, one missed day a week forgiven), 5-week calendar, edit levels |
| Closing | `/closing` | Friday review: closed, handed off, slipped, daily levels, habits per day, one change for next week |
| Month | `/month` | Day-level heatmap, days kept, task-load vs habits pattern |
| Settings | `/settings` | Capacity, hours, default level, light/dark/auto theme, export JSON, delete data |

## Code map

```
src/
  data/types.ts      data model
  data/adapters.ts   demo (localStorage) and Supabase adapters
  data/firebase.ts   Firebase Auth + Firestore adapter
  data/backend.ts    picks Firebase, Supabase or demo mode
  data/store.tsx     app state and all actions
  data/sample.ts     sample week
  lib/logic.ts       streaks, load, rebalance, brain-dump sorting, daily lines
  lib/dates.ts       local-date helpers
  components/        UI kit and the task editor
  pages/             one file per screen
supabase/migrations/ database schema with row-level security
```

## Not in v0.1 yet

AI sorting with a language model, calendar import, habit partner, push notifications, home-screen widget, achievements, shareable month card. The mock-ups for these are in the Tessera design canvas.

## Ayah of the day

`src/lib/ayah.ts` holds only a list of verse references; one is picked per date. The text is loaded live and cached in the browser:

- Arabic (Uthmani) and translation from [AlQuran Cloud](https://alquran.cloud/api): Sahih International (EN) or Elmir Kuliev (RU).
- Tafsir from [spa5k/tafsir_api](https://github.com/spa5k/tafsir_api) via jsDelivr: Al-Mukhtasar first, then Al-Jalalayn / Ibn Kathir (EN) or As-Sa'di (RU).

Turn it off or change the language in Settings.
