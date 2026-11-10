import { useState, type FormEvent } from 'react';
import { supabase } from '../data/adapters';
import { Mark } from '../components/ui';

export default function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    const res =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (res.error) setMsg(res.error.message);
    else if (mode === 'up' && !res.data.session) setMsg('Check your inbox to confirm your email, then sign in.');
  }

  return (
    <div className="page" style={{ maxWidth: 440, paddingTop: 64 }}>
      <div className="row" style={{ gap: 12 }}>
        <span className="brand-tile" style={{ width: 52, height: 52, borderRadius: 16 }}>
          <Mark size={28} />
        </span>
        <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.02em' }}>tessera</span>
      </div>
      <h1 className="h1" style={{ marginTop: 34 }}>
        {mode === 'in' ? 'Welcome back.' : 'Every task in its place.'}
      </h1>
      <p className="sub">{mode === 'in' ? 'Sign in to see your week.' : 'Create an account. Your data stays private to you.'}</p>
      <form onSubmit={submit} className="stack" style={{ marginTop: 26, gap: 14 }}>
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {msg && <div className="banner">{msg}</div>}
        <button className="btn block" disabled={busy}>
          {busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <p className="sub" style={{ textAlign: 'center', marginTop: 18 }}>
        {mode === 'in' ? 'New here? ' : 'Have an account? '}
        <button className="link" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Create an account' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}
