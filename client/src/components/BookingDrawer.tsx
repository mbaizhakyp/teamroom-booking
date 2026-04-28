/* ============================================================
   BOOKING DRAWER · slides over rooms; shows availability + form
   ============================================================ */

import { useState, useMemo, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { api, fmtDate, fmtTime, fmtRange, roman } from '../api';
import type { Room, User, Booking, BookingStatus } from '../api';
import { Surface, Meander } from './Common';

const pad = (n: number) => String(n).padStart(2, '0');

const DAY_START = 7 * 60;
const DAY_END = 22 * 60;
const TRACK_PX = 360;
const PX_PER_MIN = TRACK_PX / (DAY_END - DAY_START);

function defaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function combineISO(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}
function minutesFromMidnight(iso: string, dateStr: string) {
  const d = new Date(iso);
  const [y, m, day] = dateStr.split('-').map(Number);
  const start = new Date(y, m - 1, day, 0, 0, 0, 0);
  return (d.getTime() - start.getTime()) / 60000;
}
function pxFromMin(min: number) {
  const c = Math.max(DAY_START, Math.min(DAY_END, min));
  return (c - DAY_START) * PX_PER_MIN;
}
function overlaps(a1: number, a2: number, b1: number, b2: number) {
  return a1 < b2 && b1 < a2;
}

interface TimelineProps {
  date: string;
  dayBookings: Booking[];
  selStart: number | null;
  selEnd: number | null;
  hasConflict: boolean;
  onPick: (min: number) => void;
}

function AvailabilityTimeline({ date, dayBookings, selStart, selEnd, hasConflict, onPick }: TimelineProps) {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const isToday = date === todayStr;
  const nowMin = today.getHours() * 60 + today.getMinutes();
  const showNow = isToday && nowMin >= DAY_START && nowMin <= DAY_END;
  const trackRef = useRef<HTMLDivElement>(null);

  function handleClick(e: ReactMouseEvent<HTMLDivElement>) {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const min = DAY_START + y / PX_PER_MIN;
    onPick(Math.round(min / 30) * 30);
  }

  const hours: number[] = [];
  for (let h = DAY_START; h <= DAY_END; h += 60) hours.push(h);

  return (
    <div>
      <div className="row between" style={{ marginBottom: 10 }}>
        <span className="section-label">Availability · {fmtDate(date + 'T12:00:00')}</span>
        <span className="mono muted">{dayBookings.length} booking{dayBookings.length === 1 ? '' : 's'}</span>
      </div>
      <div className="timeline timeline-hours">
        <div className="timeline-axis" style={{ height: TRACK_PX }}>
          {hours.map(h => (
            <div key={h} className="timeline-axis-tick" style={{ height: TRACK_PX / (hours.length - 1) }}>
              {pad(Math.floor(h / 60))}
            </div>
          ))}
        </div>
        <div ref={trackRef} className="timeline-track" style={{ height: TRACK_PX, cursor: 'crosshair' }} onClick={handleClick} title="Click to set start time">
          {dayBookings.map(b => {
            const s = minutesFromMidnight(b.startTime, date);
            const e = minutesFromMidnight(b.endTime, date);
            if (e <= DAY_START || s >= DAY_END) return null;
            const top = pxFromMin(s);
            const bottom = pxFromMin(e);
            return (
              <div key={b.id} className={'timeline-slot ' + b.status.toLowerCase()} style={{ top, height: Math.max(18, bottom - top) }}>
                {fmtTime(b.startTime)}–{fmtTime(b.endTime)}
              </div>
            );
          })}
          {selStart != null && selEnd != null && selEnd > selStart && (
            <div
              className={'timeline-selection' + (hasConflict ? ' conflict' : '')}
              style={{ top: pxFromMin(selStart), height: Math.max(20, pxFromMin(selEnd) - pxFromMin(selStart)) }}
            >
              {hasConflict ? '⚠ Conflict' : 'Your booking'}
            </div>
          )}
          {showNow && <div className="timeline-now" style={{ top: pxFromMin(nowMin) }} />}
        </div>
      </div>
      <div className="legend" style={{ marginTop: 14 }}>
        <span className="legend-item"><span className="legend-swatch confirmed" />Confirmed</span>
        <span className="legend-item"><span className="legend-swatch pending" />Pending</span>
        <span className="legend-item"><span className="legend-swatch you" />Your selection</span>
      </div>
    </div>
  );
}

interface BookingDrawerProps {
  room: Room;
  currentUser: User;
  users: User[];
  bookings: Booking[];
  prefill: { date: string; startMin: number } | null;
  onClose: () => void;
  onBooked: () => void | Promise<void>;
  showToast: (msg: string, kind?: string | null) => void;
}

export function BookingDrawer({ room, currentUser, users, bookings, prefill, onClose, onBooked, showToast }: BookingDrawerProps) {
  const initStart = prefill?.startMin != null
    ? `${pad(Math.floor(prefill.startMin / 60))}:${pad(prefill.startMin % 60)}` : '09:00';
  const initEnd = prefill?.startMin != null
    ? `${pad(Math.floor(Math.min(22 * 60, prefill.startMin + 60) / 60))}:${pad(Math.min(22 * 60, prefill.startMin + 60) % 60)}` : '11:00';
  const [date, setDate] = useState(prefill?.date || defaultDate());
  const [start, setStart] = useState(initStart);
  const [end, setEnd] = useState(initEnd);
  const [status, setStatus] = useState<BookingStatus>('CONFIRMED');
  const [userId, setUserId] = useState<number>(currentUser?.id || (users[0] && users[0].id) || 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const startISO = combineISO(date, start);
  const endISO = combineISO(date, end);
  const valid = new Date(endISO) > new Date(startISO);

  const dayBookings = useMemo(() => {
    const dayStart = new Date(`${date}T00:00:00`).getTime();
    const dayEnd = dayStart + 86400000;
    return bookings
      .filter(b => b.roomId === room.id && b.status !== 'CANCELLED')
      .filter(b => {
        const s = new Date(b.startTime).getTime();
        const e = new Date(b.endTime).getTime();
        return s < dayEnd && e > dayStart;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [bookings, room.id, date]);

  const selStartMin = valid ? minutesFromMidnight(startISO, date) : null;
  const selEndMin = valid ? minutesFromMidnight(endISO, date) : null;

  const conflicts = useMemo(() => {
    if (!valid || selStartMin == null || selEndMin == null) return [];
    return dayBookings.filter(b => {
      const s = minutesFromMidnight(b.startTime, date);
      const e = minutesFromMidnight(b.endTime, date);
      return overlaps(selStartMin, selEndMin, s, e);
    });
  }, [dayBookings, selStartMin, selEndMin, valid, date]);

  const hasConflict = conflicts.length > 0;

  const dur = useMemo(() => {
    const ms = new Date(endISO).getTime() - new Date(startISO).getTime();
    if (ms <= 0) return null;
    const mins = Math.round(ms / 60000);
    const h = Math.floor(mins / 60); const m = mins % 60;
    return h ? `${h}h${m ? ' ' + m + 'm' : ''}` : `${m}m`;
  }, [startISO, endISO]);

  function pickStartMinute(min: number) {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const curDur = (eh * 60 + em) - (sh * 60 + sm);
    const newStart = Math.max(DAY_START, Math.min(DAY_END - 30, min));
    const newEnd = Math.min(DAY_END, newStart + Math.max(30, curDur));
    setStart(`${pad(Math.floor(newStart / 60))}:${pad(newStart % 60)}`);
    setEnd(`${pad(Math.floor(newEnd / 60))}:${pad(newEnd % 60)}`);
  }

  async function submit() {
    if (!valid) { setErr('End must follow the start.'); return; }
    if (hasConflict && status !== 'CANCELLED') { setErr('This hall is already reserved during that time.'); return; }
    setBusy(true); setErr(null);
    try {
      await api.createBooking({
        userId: Number(userId), roomId: room.id, startTime: startISO, endTime: endISO, status,
      });
      showToast(`Hall reserved · ${room.name}`, 'gold');
      await onBooked();
    } catch (ex: any) {
      if (ex.response?.status === 401) setErr('Thy session has expired. Please re-enter.');
      else setErr(ex.response?.data?.message || ex.message || 'Reservation refused.');
    } finally { setBusy(false); }
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-head">
          <div>
            <div className="eyebrow">Reserve · Hall {roman(room.id)}</div>
            <h3 className="title" style={{ fontSize: 28, marginTop: 6 }}>{room.name}</h3>
            <div className="muted italic" style={{ marginTop: 6, fontSize: 17 }}>Capacity: {room.capacity} scholars</div>
          </div>
          <button className="icon-x" onClick={onClose}>×</button>
        </div>

        <div className="drawer-body">
          <Surface style={{ padding: 24 }}>
            <div className="section-label" style={{ marginBottom: 14 }}>The Appointed Day</div>
            <div className="field">
              <label>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="row gap-24" style={{ marginTop: 18 }}>
              <div className="field" style={{ flex: 1 }}>
                <label>Start</label>
                <input type="time" value={start} onChange={e => setStart(e.target.value)} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>End</label>
                <input type="time" value={end} onChange={e => setEnd(e.target.value)} />
              </div>
            </div>
            {dur && (
              <div className="row between" style={{ marginTop: 18 }}>
                <span className="section-label">Duration</span>
                <span className="italic" style={{ fontSize: 20 }}>{dur}</span>
              </div>
            )}
          </Surface>

          <AvailabilityTimeline
            date={date}
            dayBookings={dayBookings}
            selStart={selStartMin}
            selEnd={selEndMin}
            hasConflict={hasConflict}
            onPick={pickStartMinute}
          />

          {hasConflict && (
            <div className="warn">
              ⚠ Overlap with {conflicts.length} existing reservation{conflicts.length === 1 ? '' : 's'}
              <span style={{ marginLeft: 'auto', textTransform: 'none', letterSpacing: '0.05em', fontStyle: 'italic', fontFamily: 'Cormorant Garamond, serif', fontSize: 15 }}>
                {conflicts.map(c => `${fmtTime(c.startTime)}–${fmtTime(c.endTime)}`).join(' · ')}
              </span>
            </div>
          )}

          <div className="field">
            <label>On behalf of</label>
            <select value={userId} onChange={e => setUserId(Number(e.target.value))}>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}
            </select>
          </div>

          <div className="col gap-12">
            <span className="section-label">Status</span>
            <div className="row gap-12">
              {(['PENDING', 'CONFIRMED', 'CANCELLED'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  className={'btn ' + (status === s ? 'btn-primary' : '')}
                  style={{ flex: 1, padding: '12px 8px', fontSize: 10 }}
                  onClick={() => setStatus(s)}
                >{s}</button>
              ))}
            </div>
          </div>

          {err && <div style={{ color: '#B0464D', fontFamily: 'Cinzel', fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase' }}>⚠ {err}</div>}

          <Meander thin />

          <div className="italic muted" style={{ fontSize: 15 }}>
            Tap the column to set thy start time. The chosen window must not overlap with confirmed or pending reservations.
          </div>
        </div>

        <div className="drawer-foot">
          <span className="mono muted">{fmtDate(startISO)} · {fmtRange(startISO, endISO)}</span>
          <div className="row gap-12">
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={!valid || busy || (hasConflict && status !== 'CANCELLED')} onClick={submit}>
              {busy ? 'Inscribing…' : (hasConflict ? 'Conflicts' : 'Reserve hall')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
