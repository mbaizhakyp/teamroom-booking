import { useState, useEffect } from 'react';
import { api, tokenStore } from './api';
import type { User, Room, Booking } from './api';
import { Toast, Brand } from './components/Common';
import { AuthPage } from './components/AuthPage';
import { RoomsPage } from './components/RoomsPage';
import type { RoomPickPrefill } from './components/RoomsPage';
import './App.css';

interface AuthedState { token: string; user: User; }

function App() {
  const [authed, setAuthed] = useState<AuthedState | null>(() => {
    const t = tokenStore.get();
    if (!t) return null;
    const decoded = tokenStore.decode();
    if (!decoded || decoded.exp < Date.now()) { tokenStore.clear(); return null; }
    return { token: t, user: { id: decoded.uid, name: 'Scholar', email: '' } };
  });

  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string | null; kind: string | null }>({ msg: null, kind: null });
  const showToast = (msg: string, kind?: string | null) => setToast({ msg, kind: kind || null });

  async function loadAll() {
    setLoading(true);
    try {
      const [r, b, u] = await Promise.all([api.getRooms(), api.getBookings(), api.getUsers()]);
      setRooms(r.data); setBookings(b.data); setUsers(u.data);
      if (authed && (!authed.user.email || authed.user.name === 'Scholar')) {
        const me = u.data.find(x => x.id === authed.user.id);
        if (me) setAuthed(a => a ? { ...a, user: me } : a);
      }
    } catch (e) { console.error('load error', e); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (authed) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed?.token]);

  function logout() { tokenStore.clear(); setAuthed(null); showToast('Farewell, scholar'); }

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

      <RoomsPage
        rooms={rooms}
        bookings={bookings}
        loading={loading}
        isMock={api.isMock()}
        onPickRoom={(r) => console.log('picked room', r)}
        onNewRoom={async (data) => {
          await api.createRoom(data);
          await loadAll();
          showToast(`${data.name} consecrated`, 'gold');
        }}
      />

      <Toast msg={toast.msg} kind={toast.kind} onDone={() => setToast({ msg: null, kind: null })} />
    </div>
  );
}

export default App;