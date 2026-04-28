/* ============================================================
   ROOMS PAGE · availability grid (halls × time)
   ============================================================ */

import { useState, useMemo } from 'react';
import { fmtDate, fmtTime } from '../api';
import type { Room, Booking } from '../api';
import { Pediment, Meander } from './Common';

const SLOT_MIN = 30;
const GRID_START = 7 * 60;
const GRID_END = 22 * 60;
const SLOT_COUNT = (GRID_END - GRID_START) / SLOT_MIN;

const isoDayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const p2 = (n: number) => String(n).padStart(2, '0');
const slotLabel = (min: number) => `${p2(Math.floor(min / 60))}:${p2(min % 60)}`;

export interface RoomPickPrefill { date: string; startMin: number; }

interface RoomsPageProps {
  rooms: Room[];
  bookings: Booking[];
  loading: boolean;
  isMock: boolean;
  onPickRoom: (r: Room, prefill?: RoomPickPrefill) => void;
  onNewRoom: (data: { name: string; capacity: number }) => Promise<void>;
}

export function RoomsPage({ rooms, bookings, loading, isMock, onPickRoom, onNewRoom }: RoomsPageProps) {
  const [showNew, setShowNew] = useState(false);
  const [day, setDay] = useState(() => new Date());

  const dayKey = isoDayKey(day);
  const dayStartMs = new Date(`${dayKey}T00:00:00`).getTime();
  const dayEndMs = dayStartMs + 86400000;

  const byRoom = useMemo(() => {
    const map: Record<number, Booking[]> = {};
    rooms.forEach(r => { map[r.id] = []; });
    bookings.forEach(b => {
      if (b.status === 'CANCELLED') return;
      const s = new Date(b.startTime).getTime();
      const e = new Date(b.endTime).getTime();
      if (s < dayEndMs && e > dayStartMs && map[b.roomId]) map[b.roomId].push(b);
    });
    return map;
  }, [bookings, rooms, dayKey]);

  function slotsForRoom(rid: number): (Booking | null)[] {
    const arr: (Booking | null)[] = new Array(SLOT_COUNT).fill(null);
    (byRoom[rid] || []).forEach(b => {
      const sMin = (new Date(b.startTime).getTime() - dayStartMs) / 60000;
      const eMin = (new Date(b.endTime).getTime() - dayStartMs) / 60000;
      const startSlot = Math.max(0, Math.floor((sMin - GRID_START) / SLOT_MIN));
      const endSlot = Math.min(SLOT_COUNT, Math.ceil((eMin - GRID_START) / SLOT_MIN));
      for (let i = startSlot; i < endSlot; i++) arr[i] = b;
    });
    return arr;
  }

  const hourCols: number[] = [];
  for (let m = GRID_START; m < GRID_END; m += 60) hourCols.push(m);

  const now = new Date();
  const isToday = isoDayKey(now) === dayKey;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  function shiftDay(delta: number) {
    const d = new Date(day);
    d.setDate(d.getDate() + delta);
    setDay(d);
  }

  function onCellClick(room: Room, slotIndex: number, booking: Booking | null) {
    const min = GRID_START + slotIndex * SLOT_MIN;
    if (booking) { onPickRoom(room, { date: dayKey, startMin: min }); return; }
    if (isToday && min < nowMin) return;
    onPickRoom(room, { date: dayKey, startMin: min });
  }

  const cols = `200px repeat(${SLOT_COUNT}, minmax(34px, 1fr))`;

  return (
    <div className="page fade-in">
      <Pediment
        eyebrow="Floor I · The Inner Halls"
        title="The Library Floor"
        sub="A single view of every hall through the day. Coloured cells are reserved; tap any open cell to book that slot."
      />

      <div className="row between" style={{ marginTop: 8 }}>
        <div className="row gap-24">
          <span className="section-label">{rooms.length} halls</span>
          <span className="section-label">
            {bookings.filter(b => {
              const s = new Date(b.startTime).getTime();
              return b.status !== 'CANCELLED' && s >= dayStartMs && s < dayEndMs;
            }).length} bookings · {fmtDate(dayKey + 'T12:00:00')}
          </span>
        </div>
        <button className="btn btn-ghost" onClick={() => setShowNew(true)}>+ Consecrate a hall</button>
      </div>

      {loading ? (
        <div className="center muted italic" style={{ padding: 80, fontSize: 22 }}>Unrolling the scrolls…</div>
      ) : (
        <div className="grid-wrap">
          <div className="grid-controls">
            <div className="nav-day">
              <button className="btn" style={{ padding: '8px 14px' }} onClick={() => shiftDay(-1)}>←</button>
              <button className="btn" style={{ padding: '8px 14px' }} onClick={() => setDay(new Date())}>Today</button>
              <button className="btn" style={{ padding: '8px 14px' }} onClick={() => shiftDay(1)}>→</button>
              <span className="title" style={{ fontSize: 16, marginLeft: 14 }}>
                {day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <div className="grid-legend">
              <span className="legend-item"><span className="legend-swatch confirmed" />Confirmed</span>
              <span className="legend-item"><span className="legend-swatch pending" />Pending</span>
              <span className="legend-item"><span className="legend-swatch you" />Open · click to book</span>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: cols }}>
            <div className="grid-head corner">Hall · Time</div>
            {hourCols.map(h => (
              <div key={h} className="grid-head" style={{ gridColumn: 'span 2' }}>
                {p2(Math.floor(h / 60))}:00
              </div>
            ))}

            {rooms.map(r => {
              const slots = slotsForRoom(r.id);
              return (
                <div key={r.id} style={{ display: 'contents' }}>
                  <div className="grid-row-head" onClick={() => onPickRoom(r)} style={{ cursor: 'pointer' }}>
                    <span>{r.name}</span>
                    <span className="seats">{r.capacity} seats · RM-{String(r.id).padStart(3, '0')}</span>
                  </div>
                  {slots.map((b, i) => {
                    const slotMin = GRID_START + i * SLOT_MIN;
                    const isPast = isToday && slotMin < nowMin;
                    const nowCell = isToday && slotMin <= nowMin && slotMin + SLOT_MIN > nowMin;
                    const prev = i > 0 ? slots[i - 1] : null;
                    const isStart = b && b !== prev;
                    const cls = [
                      'grid-cell',
                      b ? b.status.toLowerCase() : '',
                      isStart ? 'start' : '',
                      isPast ? 'past' : '',
                      nowCell ? 'now-marker' : '',
                    ].filter(Boolean).join(' ');
                    const label = b ? `${fmtTime(b.startTime)}–${fmtTime(b.endTime)}` : '';
                    return (
                      <div
                        key={i}
                        className={cls}
                        data-label={label}
                        title={b ? `${r.name} · ${b.status} · ${label}` : `${r.name} · Free at ${slotLabel(slotMin)}`}
                        onClick={() => onCellClick(r, i, b)}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Meander style={{ marginTop: 56 }} />

      <div className="row between" style={{ marginTop: 24 }}>
        <span className="italic muted" style={{ fontSize: 16 }}>
          “All who enter, leave wiser than they came.”
        </span>
        <span className="mono muted">{isMock ? 'demo · mock data' : 'live · localhost:3000'}</span>
      </div>

      {showNew && <NewRoomModal onClose={() => setShowNew(false)} onCreate={async (d) => { await onNewRoom(d); setShowNew(false); }} />}
    </div>
  );
}

function NewRoomModal({ onClose, onCreate }: { onClose: () => void; onCreate: (d: { name: string; capacity: number }) => Promise<void> }) {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(8);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <div>
            <div className="eyebrow">New Hall</div>
            <h3 className="title" style={{ fontSize: 24, marginTop: 4 }}>Consecrate a chamber</h3>
          </div>
          <button className="icon-x" onClick={onClose}>×</button>
        </div>
        <div className="drawer-body">
          <div className="field">
            <label>Name of the hall</label>
            <input type="text" placeholder="Hall of Archimedes" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Seats · Capacity</label>
            <input type="number" min={1} max={200} value={capacity} onChange={e => setCapacity(parseInt(e.target.value) || 1)} />
          </div>
          <Meander thin />
          <div className="italic muted" style={{ fontSize: 16 }}>
            New halls are open to all scholars. Naming carries weight — choose a steward of wisdom.
          </div>
        </div>
        <div className="drawer-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!name.trim() || busy}
            onClick={async () => { setBusy(true); try { await onCreate({ name: name.trim(), capacity }); } finally { setBusy(false); } }}
          >
            {busy ? 'Inscribing…' : 'Consecrate'}
          </button>
        </div>
      </div>
    </>
  );
}
