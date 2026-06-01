'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken, setUser } from '@/lib/api';

const LOGO = 'https://rainlandautocorp.com/logo.png';
const HERO = 'https://rainlandautocorp.com/landing.png';

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
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-950 text-white">
      {/* Left: brand panel */}
      <div
        className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(7,16,38,0.92) 0%, rgba(15,30,72,0.88) 60%, rgba(29,78,216,0.75) 100%), url('${HERO}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt="Rainland Autocorp" className="h-12 w-auto drop-shadow" />
          <div className="leading-tight">
            <div className="text-lg font-semibold tracking-wide">RAINLAND AUTOCORP</div>
            <div className="text-xs text-blue-200">Private Limited</div>
          </div>
        </div>

        <div className="space-y-5">
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight">
            Driving Innovation,<br/>Power &amp; Sustainability
          </h1>
          <p className="text-blue-100 max-w-md">
            Karnataka&apos;s premier dealership for <span className="font-semibold text-white">Montra Electric Autos</span> and <span className="font-semibold text-white">Isuzu Vehicles</span>. Manage leads, test drives, bookings and deliveries across all branches in one place.
          </p>
          <div className="grid grid-cols-3 gap-3 max-w-md pt-2">
            <Stat label="Dealer of the Year" value="2017-18" />
            <Stat label="Market Share" value="#2 Nationwide" />
            <Stat label="Branches" value="5 in Karnataka" />
          </div>
        </div>

        <div className="text-xs text-blue-200/80">
          © {new Date().getFullYear()} Rainland Autocorp Private Limited · Bangalore · Shimoga · Chikmagalur · Mangalore · Thirthahalli
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex items-center justify-center px-6 py-10 bg-gradient-to-b from-slate-50 to-white text-gray-900">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Rainland Autocorp" className="h-10 w-auto" />
            <div className="text-lg font-bold text-brand-dark">RAINLAND AUTOCORP</div>
          </div>

          <div className="mb-7">
            <div className="text-xs uppercase tracking-widest text-brand font-semibold">Dealer Operations Portal</div>
            <h2 className="text-3xl font-bold text-gray-900 mt-1">Sign in to your account</h2>
            <p className="text-sm text-gray-500 mt-2">Use your Rainland CRM credentials to continue.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                className="input mt-1"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Password</label>
              <input
                className="input mt-1"
                type="password"
                value={password}
                onChange={e=>setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2.5 rounded">{err}</div>}
            <button className="btn btn-primary w-full h-11 text-base" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3 text-xs text-gray-400">
            <div className="flex-1 h-px bg-gray-200" />
            <span>Authorized dealership staff only</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="mt-4 text-xs text-gray-500 text-center">
            Default credentials: <span className="font-mono">admin@rainland.in</span> / <span className="font-mono">Admin@123</span>
          </div>

          <div className="mt-8 text-center text-xs text-gray-400">
            <a href="https://rainlandautocorp.com" target="_blank" rel="noreferrer" className="hover:text-brand">rainlandautocorp.com</a>
            <span className="mx-2">·</span>
            <a href="tel:+918105094777" className="hover:text-brand">+91 81050 94777</a>
            <span className="mx-2">·</span>
            <a href="mailto:info@rainlandautocorp.com" className="hover:text-brand">info@rainlandautocorp.com</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 backdrop-blur px-3 py-2 border border-white/15">
      <div className="text-[10px] uppercase tracking-wider text-blue-200">{label}</div>
      <div className="text-sm font-semibold text-white mt-0.5">{value}</div>
    </div>
  );
}
