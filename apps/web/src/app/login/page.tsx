'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken, setUser } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@rainland.in');
  const [password, setPassword] = useState('Admin@123');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const res = await api<{ token: string; user: any }>('/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      });
      setToken(res.token); setUser(res.user);
      router.push('/dashboard');
    } catch (e: any) { setErr(e.message || 'Login failed'); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-brand-dark to-brand">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-brand">Rainland CRM</div>
          <div className="text-sm text-gray-500">Montra &amp; Isuzu Dealership Operations</div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input className="input mt-1" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input className="input mt-1" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          {err && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{err}</div>}
          <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <div className="mt-4 text-xs text-gray-400 text-center">
          Default: admin@rainland.in / Admin@123
        </div>
      </div>
    </div>
  );
}
