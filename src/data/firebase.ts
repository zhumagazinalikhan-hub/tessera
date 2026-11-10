import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { defaultProfile, type Adapter, type AuthApi } from './adapters';
import type { DB, Profile, Table } from './types';

const env = import.meta.env;
export const firebaseConfigured = !!(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID);

const app = firebaseConfigured
  ? initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    })
  : null;

// Offline cache: the app keeps working without a connection and syncs later.
const fs = app ? initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }) : null;
const auth = app ? getAuth(app) : null;

// users/{uid} holds the profile; each table is a subcollection.
const COLL: Record<Table, string> = {
  tasks: 'tasks',
  habits: 'habits',
  habit_checkins: 'checkins',
  day_logs: 'dayLogs',
  focus_sessions: 'sessions',
  weekly_reviews: 'reviews',
};

let currentUid = '';

async function all<T>(uid: string, table: Table): Promise<T[]> {
  const snap = await getDocs(collection(fs!, 'users', uid, COLL[table]));
  return snap.docs.map((d) => d.data() as T);
}

/** Firestore rejects `undefined`; strip it. */
const clean = <T extends object>(row: T) => JSON.parse(JSON.stringify(row)) as T;

export const firebaseAdapter: Adapter = {
  async load(uid) {
    currentUid = uid;
    const pSnap = await getDoc(doc(fs!, 'users', uid));
    let profile = pSnap.exists() ? (pSnap.data() as Profile) : null;
    if (!profile) {
      profile = defaultProfile(uid);
      await setDoc(doc(fs!, 'users', uid), profile);
    }
    const [tasks, habits, checkins, dayLogs, sessions, reviews] = await Promise.all([
      all<DB['tasks'][number]>(uid, 'tasks'),
      all<DB['habits'][number]>(uid, 'habits'),
      all<DB['checkins'][number]>(uid, 'habit_checkins'),
      all<DB['dayLogs'][number]>(uid, 'day_logs'),
      all<DB['sessions'][number]>(uid, 'focus_sessions'),
      all<DB['reviews'][number]>(uid, 'weekly_reviews'),
    ]);
    tasks.sort((a, b) => a.created_at.localeCompare(b.created_at));
    habits.sort((a, b) => a.created_at.localeCompare(b.created_at));
    return { profile: { ...defaultProfile(uid), ...profile }, tasks, habits, checkins, dayLogs, sessions, reviews };
  },
  async persist(_next, change) {
    const uid = currentUid;
    if (change.kind === 'profile') await setDoc(doc(fs!, 'users', uid), clean(change.row));
    else if (change.kind === 'put') await setDoc(doc(fs!, 'users', uid, COLL[change.table], change.row.id), clean(change.row));
    else await deleteDoc(doc(fs!, 'users', uid, COLL[change.table], change.id));
  },
  async wipe(uid) {
    for (const t of Object.keys(COLL) as Table[]) {
      const snap = await getDocs(collection(fs!, 'users', uid, COLL[t]));
      for (let i = 0; i < snap.docs.length; i += 400) {
        const b = writeBatch(fs!);
        snap.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
        await b.commit();
      }
    }
  },
};

export const firebaseAuth: AuthApi = {
  onChange(cb) {
    return onAuthStateChanged(auth!, (u) => cb(u ? { id: u.uid, email: u.email } : null));
  },
  async signIn(email, password) {
    await signInWithEmailAndPassword(auth!, email, password);
    return { needsConfirm: false };
  },
  async signUp(email, password) {
    await createUserWithEmailAndPassword(auth!, email, password);
    return { needsConfirm: false };
  },
  async google() {
    await signInWithPopup(auth!, new GoogleAuthProvider());
  },
  async signOut() {
    await signOut(auth!);
  },
};
