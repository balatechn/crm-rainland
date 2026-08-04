'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicClientApplication, AuthenticationResult } from '@azure/msal-browser';
import { api, setToken, setUser } from '@/lib/api';

const LOGO = 'https://rainlandautocorp.com/logo.png';
const HERO = 'https://rainlandautocorp.com/landing.png';

const MS_CLIENT_ID  = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID  || '';
const MS_TENANT_ID  = process.env.NEXT_PUBLIC_MICROSOFT_TENANT_ID  || 'common';

// Lazy MSAL instance — only initialized in browser when env vars are present
let _msal: PublicClientApplication | null = null;

async function getMsal(): Promise<PublicClientApplication | null> {
  if (!MS_CLIENT_ID || typeof window === 'undefined') return null;
  if (_msal) return _msal;
  const { PublicClientApplication } = await import('@azure/msal-browser');
  _msal = new PublicClientApplication({
    auth: {
      clientId: MS_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${MS_TENANT_ID}`,
      redirectUri: window.location.origin + '/login',
    },
    cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false },
  });
  await _msal.initialize();
  return _msal;
}

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('admin@rainland.in');
  const [password, setPassword] = useState('Admin@123');
  const [err,      setErr]      = useState<string | null>(null);
  const [busy,     setBusy]     = useState(false);
  const [pending,  setPending]  = useState(false);
  const [msReady,  setMsReady]  = useState(false);
  const handled = useRef(false);

  // Handle MSAL redirect on mount
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    getMsal().then(async msal => {
      if (!msal) return;
      setMsReady(true);
      try {
        const result: AuthenticationResult | null = await msal.handleRedirectPromise();
        if (result?.idToken) await signInWithMsToken(result.idToken);
      } catch (e: any) {
        setErr(e.message || 'Microsoft redirect error');
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function signInWithMicrosoft() {
    setBusy(true); setErr(null);
    try {
      const msal = await getMsal();
      if (!msal) { setErr('Microsoft SSO is not configured'); setBusy(false); return; }
      await msal.loginRedirect({ scopes: ['openid', 'profile', 'email'] });
      // page navigates away; busy stays true
    } catch (e: any) {
      setErr(e.message || 'Microsoft redirect failed');
      setBusy(false);
    }
  }

  async function signInWithMsToken(idToken: string) {
    setBusy(true); setErr(null);
    try {
      const res = await api<any>('/auth/microsoft', {
        method: 'POST', body: JSON.stringify({ idToken }),
      });
      if (res.pending) {
        setPending(true);
      } else {
        setToken(res.token); setUser(res.user);
        router.push('/dashboard');
      }
    } catch (e: any) {
      setErr(e.message || 'Microsoft sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  const msConfigured = !!MS_CLIENT_ID;

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
            <p className="text-sm text-gray-500 mt-2">Use your Rainland CRM or Microsoft credentials.</p>
          </div>

          {/* Pending approval state */}
          {pending ? (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 text-center space-y-3">
              <div className="text-3xl">⏳</div>
              <div className="text-base font-semibold text-amber-800">Account Pending Approval</div>
              <p className="text-sm text-amber-700">
                Your Microsoft account has been registered. An administrator will review and approve your access shortly.
              </p>
              <p className="text-xs text-amber-600 mt-1">Contact your system administrator if urgent.</p>
            </div>
          ) : (
            <>
              {/* Microsoft SSO button */}
              {msConfigured && (
                <button
                  onClick={signInWithMicrosoft}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-3 h-11 mb-4 border-2 border-gray-200 rounded-xl bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-700 font-semibold text-sm transition-all disabled:opacity-50 shadow-sm"
                >
                  <MicrosoftIcon />
                  {busy && !pending ? 'Redirecting…' : 'Sign in with Microsoft'}
                </button>
              )}

              {msConfigured && (
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span>or sign in with email</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input
                    className="input mt-1"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
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
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                {err && <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2.5 rounded">{err}</div>}
                <button className="btn btn-primary w-full h-11 text-base" disabled={busy}>
                  {busy ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
            </>
          )}

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

function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  );
}
