/* ============================================================
   AUTH PAGE · login + signup tabs
   ============================================================ */

import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { api, tokenStore } from '../api';
import type { AuthResponse } from '../api';
import { Brand, Meander } from './Common';

interface AuthPageProps {
  onAuthed: (a: { token: string; user: AuthResponse['user'] }) => void;
  showToast: (msg: string, kind?: string | null) => void;
}

export function AuthPage({ onAuthed, showToast }: AuthPageProps) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ name: '', email: 'hypatia@library.gr', password: 'password' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onChange = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      if (tab === 'signup') {
        if (!form.name.trim()) throw new Error('Please inscribe thy name.');
        await api.createUser({ name: form.name, email: form.email, password: form.password });
      }
      const res = await api.auth({ email: form.email, password: form.password });
      tokenStore.set(res.data.token);
      const user = res.data.user || { id: 0, email: form.email, name: form.name || form.email.split('@')[0] };
      onAuthed({ token: res.data.token, user });
      showToast(tab === 'signup' ? 'Welcome to the agora' : 'Entry granted', 'gold');
    } catch (ex: any) {
      setErr(ex.response?.data?.message || ex.message || 'Something went amiss');
    } finally { setBusy(false); }
  }

  return (
    <div className="auth-wrap fade-in">
      <div className="auth-art">
        <div className="auth-pillars">
          {Array.from({ length: 7 }).map((_, i) => <div key={i} className="auth-pillar" />)}
        </div>
        <div style={{ position: 'relative', zIndex: 2 }}><Brand /></div>
        <div className="auth-art-title rise">
          ΣΥΝΕΔΡΙΟΝ
          <em>Reserve the chambers of the great library.</em>
        </div>
        <div className="auth-art-foot">
          <span>EST · MMXXVI</span>
          <span>Bibliotheca Alexandrina</span>
        </div>
      </div>

      <div className="auth-form-side">
        <form className="auth-form rise-2" onSubmit={submit}>
          <div className="eyebrow">Enter the Stoa</div>
          <h2 className="title" style={{ fontSize: 34, marginTop: -8 }}>
            {tab === 'login' ? 'Welcome, scholar' : 'Inscribe thy name'}
          </h2>

          <div className="auth-tabs">
            <button type="button" className={'auth-tab ' + (tab === 'login' ? 'active' : '')} onClick={() => { setTab('login'); setErr(null); }}>Sign in</button>
            <button type="button" className={'auth-tab ' + (tab === 'signup' ? 'active' : '')} onClick={() => { setTab('signup'); setErr(null); }}>Register</button>
          </div>

          {tab === 'signup' && (
            <div className="field">
              <label>Name</label>
              <input type="text" placeholder="Hypatia of Alexandria" value={form.name} onChange={onChange('name')} required />
            </div>
          )}

          <div className="field">
            <label>Electronic Scroll · Email</label>
            <input type="email" placeholder="scholar@library.gr" value={form.email} onChange={onChange('email')} required />
          </div>

          <div className="field">
            <label>Cipher · Password</label>
            <input type="password" placeholder="••••••••" value={form.password} onChange={onChange('password')} required />
          </div>

          {err && <div style={{ color: '#B0464D', fontFamily: 'Cinzel', fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase' }}>⚠ {err}</div>}

          <div className="row between" style={{ marginTop: 12 }}>
            <span className="mono muted">{api.isMock() ? 'Demo mode · mock store' : 'localhost:3000'}</span>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Consulting the oracle…' : (tab === 'login' ? 'Enter' : 'Register & Enter')}
              <span style={{ fontSize: 14, letterSpacing: 0 }}>→</span>
            </button>
          </div>

          <Meander thin style={{ marginTop: 16 }} />

          <div className="muted italic" style={{ fontSize: 15 }}>
            Try <span className="mono" style={{ fontStyle: 'normal' }}>hypatia@library.gr</span> · <span className="mono" style={{ fontStyle: 'normal' }}>password</span>
          </div>
        </form>
      </div>
    </div>
  );
}
