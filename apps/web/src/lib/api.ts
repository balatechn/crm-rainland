'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('rainland_token');
}
export function setToken(t: string | null) {
  if (typeof window === 'undefined') return;
  if (t) localStorage.setItem('rainland_token', t);
  else localStorage.removeItem('rainland_token');
}
export function getUser(): any | null {
  if (typeof window === 'undefined') return null;
  const s = localStorage.getItem('rainland_user');
  return s ? JSON.parse(s) : null;
}
export function setUser(u: any | null) {
  if (typeof window === 'undefined') return;
  if (u) localStorage.setItem('rainland_user', JSON.stringify(u));
  else localStorage.removeItem('rainland_user');
}

export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as any;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return (await res.text()) as any;
}

export function apiUrl(path: string) { return `${API_BASE}${path}`; }
