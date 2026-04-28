/* ============================================================
   API LAYER · Bibliotheca · Synedrion
   Real axios calls under API_BASE; falls back to a localStorage
   mock store when the server is unreachable so the prototype
   stays clickable in isolation.

   Switch to live-only by removing `withFallback` and just
   returning `realCall(...)`.
   ============================================================ */

import axios from 'axios';
import type { AxiosError, AxiosResponse } from 'axios';

// ── Types ──────────────────────────────────────────────────────

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Room {
  id: number;
  name: string;
  capacity: number;
}

export interface Booking {
  id: number;
  userId: number;
  roomId: number;
  startTime: string; // ISO
  endTime: string;   // ISO
  status: BookingStatus;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

export interface CreateRoomRequest {
  name: string;
  capacity: number;
}

export interface CreateBookingRequest {
  userId: number;
  roomId: number;
  startTime: string;
  endTime: string;
  status: BookingStatus;
}

// ── Config ─────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';
const STORE_KEY = 'greek_booking_mock_v1';
const TOKEN_KEY = 'greek_booking_token';

let usingMock = false;
export const isMock = () => usingMock;

// ── Token store ────────────────────────────────────────────────

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
  decode: (): { uid: number; exp: number } | null => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) return null;
    try { return JSON.parse(atob(t)); } catch { return null; }
  },
};

// ── Mock store (in-browser fallback) ───────────────────────────

interface MockStore {
  users: (User & { password: string })[];
  rooms: Room[];
  bookings: Booking[];
  nextId: { users: number; rooms: number; bookings: number };
}

function defaultStore(): MockStore {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  const dayAfter = new Date(now.getTime() + 2 * 86400000);
  const isoSlot = (d: Date, h: number) => {
    const x = new Date(d);
    x.setHours(h, 0, 0, 0);
    return x.toISOString();
  };
  return {
    users: [
      { id: 1, name: 'Hypatia of Alexandria', email: 'hypatia@library.gr', password: 'password' },
      { id: 2, name: 'Eratosthenes', email: 'erato@library.gr', password: 'password' },
    ],
    rooms: [
      { id: 1, name: 'Hall of Plato', capacity: 8 },
      { id: 2, name: 'Hall of Aristotle', capacity: 12 },
      { id: 3, name: 'Hall of Pythagoras', capacity: 4 },
      { id: 4, name: 'Hall of Sappho', capacity: 6 },
      { id: 5, name: 'Hall of Euclid', capacity: 10 },
    ],
    bookings: [
      { id: 1, userId: 1, roomId: 1, startTime: isoSlot(tomorrow, 9), endTime: isoSlot(tomorrow, 11), status: 'CONFIRMED' },
      { id: 2, userId: 2, roomId: 3, startTime: isoSlot(tomorrow, 14), endTime: isoSlot(tomorrow, 16), status: 'PENDING' },
      { id: 3, userId: 1, roomId: 5, startTime: isoSlot(dayAfter, 10), endTime: isoSlot(dayAfter, 12), status: 'CONFIRMED' },
    ],
    nextId: { users: 3, rooms: 6, bookings: 4 },
  };
}

function loadStore(): MockStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const s = defaultStore();
  localStorage.setItem(STORE_KEY, JSON.stringify(s));
  return s;
}

function saveStore(s: MockStore) {
  localStorage.setItem(STORE_KEY, JSON.stringify(s));
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const mock = {
  async auth(body: AuthRequest): Promise<AxiosResponse<AuthResponse>> {
    await sleep(420);
    const s = loadStore();
    const u = s.users.find(x => x.email === body.email && x.password === body.password);
    if (!u) {
      const err: any = new Error('Invalid credentials');
      err.response = { status: 401, data: { message: 'Invalid credentials' } };
      throw err;
    }
    const token = btoa(JSON.stringify({ uid: u.id, exp: Date.now() + 3600_000 }));
    return { data: { token, user: { id: u.id, name: u.name, email: u.email } } } as AxiosResponse<AuthResponse>;
  },
  async getUsers(): Promise<AxiosResponse<User[]>> {
    await sleep(180);
    const s = loadStore();
    return { data: s.users.map(({ password, ...u }) => u) } as AxiosResponse<User[]>;
  },
  async createUser(body: CreateUserRequest): Promise<AxiosResponse<User>> {
    await sleep(380);
    const s = loadStore();
    if (s.users.find(x => x.email === body.email)) {
      const err: any = new Error('Email already taken');
      err.response = { status: 409, data: { message: 'Email already taken' } };
      throw err;
    }
    const u = { id: s.nextId.users++, name: body.name, email: body.email, password: body.password };
    s.users.push(u);
    saveStore(s);
    return { data: { id: u.id, name: u.name, email: u.email } } as AxiosResponse<User>;
  },
  async getRooms(): Promise<AxiosResponse<Room[]>> {
    await sleep(200);
    const s = loadStore();
    return { data: s.rooms } as AxiosResponse<Room[]>;
  },
  async createRoom(body: CreateRoomRequest): Promise<AxiosResponse<Room>> {
    await sleep(280);
    const s = loadStore();
    const r = { id: s.nextId.rooms++, ...body };
    s.rooms.push(r);
    saveStore(s);
    return { data: r } as AxiosResponse<Room>;
  },
  async getBookings(): Promise<AxiosResponse<Booking[]>> {
    await sleep(220);
    const s = loadStore();
    return { data: s.bookings } as AxiosResponse<Booking[]>;
  },
  async createBooking(body: CreateBookingRequest): Promise<AxiosResponse<Booking>> {
    await sleep(420);
    const s = loadStore();
    const b: Booking = { id: s.nextId.bookings++, ...body };
    s.bookings.push(b);
    saveStore(s);
    return { data: b } as AxiosResponse<Booking>;
  },
};

// ── Real axios calls ───────────────────────────────────────────

const client = axios.create({ baseURL: API_BASE, timeout: 4000 });

function authHeaders() {
  const t = tokenStore.get();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function realCall<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  requireAuth = false,
): Promise<AxiosResponse<T>> {
  return client.request<T>({
    method,
    url: path,
    data: body,
    headers: { 'Content-Type': 'application/json', ...(requireAuth ? authHeaders() : {}) },
  });
}

async function withFallback<T>(real: () => Promise<AxiosResponse<T>>, fallback: () => Promise<AxiosResponse<T>>): Promise<AxiosResponse<T>> {
  try {
    return await real();
  } catch (err) {
    const e = err as AxiosError;
    if (!e.response) {
      // network unreachable → mock
      console.warn('[api] network unavailable, using mock store:', e.message);
      usingMock = true;
      return fallback();
    }
    throw err;
  }
}

// ── Public surface ─────────────────────────────────────────────

export const api = {
  isMock,
  resetMock: () => { localStorage.removeItem(STORE_KEY); },

  auth: (body: AuthRequest) => withFallback<AuthResponse>(
    () => realCall('POST', '/login', body),
    () => mock.auth(body),
  ),
  getUsers: () => withFallback<User[]>(
    () => realCall('GET', '/users'),
    () => mock.getUsers(),
  ),
  createUser: (body: CreateUserRequest) => withFallback<User>(
    () => realCall('POST', '/users', body),
    () => mock.createUser(body),
  ),
  getRooms: () => withFallback<Room[]>(
    () => realCall('GET', '/rooms'),
    () => mock.getRooms(),
  ),
  createRoom: (body: CreateRoomRequest) => withFallback<Room>(
    () => realCall('POST', '/rooms', body),
    () => mock.createRoom(body),
  ),
  getBookings: () => withFallback<Booking[]>(
    () => realCall('GET', '/bookings'),
    () => mock.getBookings(),
  ),
  createBooking: (body: CreateBookingRequest) => withFallback<Booking>(
    () => realCall('POST', '/bookings', body, true),
    () => mock.createBooking(body),
  ),
};

// ── Format helpers (used by components) ────────────────────────

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export const fmtRange = (a: string, b: string) => `${fmtTime(a)} — ${fmtTime(b)}`;

export function roman(n: number): string {
  const map: [string, number][] = [['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]];
  let out = '';
  for (const [s, v] of map) { while (n >= v) { out += s; n -= v; } }
  return out;
}
