/* ============================================================
   BOOKINGS PAGE · the ledger
   ============================================================ */

import { useState, useMemo } from 'react';
import { fmtDate, fmtRange } from '../api';
import type { Booking, Room, User } from '../api';
import { Pediment, Surface, StatusPip, Meander } from './Common';

interface BookingsPageProps {
  bookings: Booking[];
  rooms: Room[];
  users: User[];
  loading: boolean;
}

export function BookingsPage({ bookings, rooms, users, loading }: BookingsPageProps) {
  const [filter, setFilter] = useState<'ALL' | 'CONFIRMED' | 'PENDING' | 'CANCELLED'>('ALL');

  const sorted = useMemo(() => {
    const list = filter === 'ALL' ? bookings : bookings.filter(b => b.status === filter);
    return [...list].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [bookings, filter]);

  const roomName = (id: number) => rooms.find(r => r.id === id)?.name || `Hall #${id}`;
  const userName = (id: number) => users.find(u => u.id === id)?.name || `Scholar #${id}`;

  return (
    <div className="page fade-in">
      <Pediment
        eyebrow="The Ledger"
        title="Reservations"
        sub="A chronicle of every gathering inscribed within these walls."
      />

      <div className="row between" style={{ marginTop: 8 }}>
        <div className="row gap-12">
          {(['ALL', 'CONFIRMED', 'PENDING', 'CANCELLED'] as const).map(f => (
            <button
              key={f}
              className={'btn ' + (filter === f ? 'btn-primary' : '')}
              style={{ padding: '10px 18px', fontSize: 10 }}
              onClick={() => setFilter(f)}
            >{f}</button>
          ))}
        </div>
        <span className="section-label">{sorted.length} entries</span>
      </div>

      <Surface style={{ marginTop: 32, padding: '8px 32px' }}>
        {loading ? (
          <div className="center muted italic" style={{ padding: 60, fontSize: 20 }}>Consulting the ledger…</div>
        ) : sorted.length === 0 ? (
          <div className="center muted italic" style={{ padding: 60, fontSize: 20 }}>The ledger holds no entries here.</div>
        ) : (
          sorted.map((b, i) => (
            <div key={b.id} className="booking-row rise" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="num">№ {String(b.id).padStart(3, '0')}</div>
              <div className="strong">{roomName(b.roomId)}</div>
              <div className="when">
                <small>When</small>
                {fmtDate(b.startTime)}<br />
                <span className="mono" style={{ fontSize: 14, fontStyle: 'normal' }}>{fmtRange(b.startTime, b.endTime)}</span>
              </div>
              <div className="italic">{userName(b.userId)}</div>
              <div style={{ textAlign: 'right' }}><StatusPip status={b.status} /></div>
            </div>
          ))
        )}
      </Surface>

      <Meander style={{ marginTop: 56 }} />
    </div>
  );
}
