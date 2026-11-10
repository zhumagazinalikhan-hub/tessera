import { cloudAdapter, isCloud as supabaseConfigured, localAdapter, supabaseAuth, type Adapter, type AuthApi } from './adapters';
import { firebaseAdapter, firebaseAuth, firebaseConfigured } from './firebase';

// Firebase wins if configured, then Supabase, else demo mode in the browser.
export const backend: { mode: 'demo' | 'firebase' | 'supabase'; adapter: Adapter; auth: AuthApi | null } = firebaseConfigured
  ? { mode: 'firebase', adapter: firebaseAdapter, auth: firebaseAuth }
  : supabaseConfigured
    ? { mode: 'supabase', adapter: cloudAdapter, auth: supabaseAuth }
    : { mode: 'demo', adapter: localAdapter, auth: null };
