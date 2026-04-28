import { useState } from 'react';
import { tokenStore } from './api';
import type { User } from './api';
import { Toast, Brand } from './components/Common';
import { AuthPage } from './components/AuthPage';
import './App.css';

interface AuthedState { token: string; user: User; }

function App() {
  const [authed, setAuthed] = useState<AuthedState | null>(() => {
    const t = tokenStore.get();
    if (!t) return null;
    const decoded = tokenStore.decode();
    if (!decoded || decoded.exp < Date.now()) {
      tokenStore.clear();
      return null;
    }
    return { token: t, user: { id: decoded.uid, name: 'Scholar', email: '' } };
  });

  const [toast, setToast] = useState<{ msg: string | null; kind: string | null }>({ msg: null, kind: null });
  const showToast = (msg: string, kind?: string | null) => setToast({ msg, kind: kind || null });

  function logout() {
    tokenStore.clear();
    setAuthed(null);
    showToast('Farewell, scholar');
  }

  if (!authed) {
    return (
      <div className="app">
        <AuthPage onAuthed={setAuthed} showToast={showToast} />
        <Toast msg={toast.msg} kind={toast.kind} onDone={() => setToast({ msg: null, kind: null })} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <Brand />
        <div className="row gap-24">
          <div style={{ textAlign: 'right' }}>
            <div className="section-label">Logged in as</div>
            <div className="italic" style={{ fontSize: 17, lineHeight: 1.1 }}>{authed.user.name}</div>
          </div>
          <button className="btn" style={{ padding: '10px 16px' }} onClick={logout}>Exit</button>
        </div>
      </header>
      <div className="page" style={{ display: 'grid', placeItems: 'center' }}>
        <div className="eyebrow">Phase 3 complete · auth wired</div>
      </div>
      <Toast msg={toast.msg} kind={toast.kind} onDone={() => setToast({ msg: null, kind: null })} />
    </div>
  );
}

export default App;