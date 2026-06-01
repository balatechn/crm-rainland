'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, Users, Phone, FileText, Car, Building2,
  CalendarCheck, ClipboardList, Truck, MessageCircle, BarChart3,
  LogOut, Menu, X, Tag, ShieldCheck, History, ChevronDown,
} from 'lucide-react';
import { getToken, getUser, setToken, setUser } from '@/lib/api';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string; icon: any; roles?: string[] };

const LOGO = 'https://rainlandautocorp.com/logo.png';

const PRIMARY: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/leads',        label: 'Leads',         icon: Users },
  { href: '/pipeline',     label: 'Pipeline',      icon: ClipboardList },
  { href: '/test-drives',  label: 'Test Drives',   icon: CalendarCheck },
  { href: '/quotations',   label: 'Quotations',    icon: FileText },
  { href: '/bookings',     label: 'Bookings',      icon: Tag },
  { href: '/deliveries',   label: 'Deliveries',    icon: Truck },
  { href: '/whatsapp',     label: 'WhatsApp',      icon: MessageCircle },
  { href: '/reports',      label: 'Reports',       icon: BarChart3 },
];

const MASTERS: NavItem[] = [
  { href: '/masters/branches', label: 'Branches',     icon: Building2,  roles: ['ADMIN','CRM_MANAGER','SALES_HEAD'] },
  { href: '/masters/vehicles', label: 'Vehicles',     icon: Car,        roles: ['ADMIN','CRM_MANAGER','SALES_HEAD'] },
  { href: '/masters/sources',  label: 'Lead Sources', icon: Phone,      roles: ['ADMIN','CRM_MANAGER','SALES_HEAD'] },
  { href: '/users',            label: 'Users',        icon: ShieldCheck,roles: ['ADMIN','CRM_MANAGER'] },
  { href: '/audit',            label: 'Audit Logs',   icon: History,    roles: ['ADMIN','CRM_MANAGER'] },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setU] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mastersOpen, setMastersOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const mastersRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!getToken()) { router.replace('/login'); return; }
    setU(getUser());
  }, [router]);

  // close dropdowns on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (mastersRef.current && !mastersRef.current.contains(e.target as Node)) setMastersOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // close mobile drawer on navigation
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  function logout() {
    setToken(null); setUser(null); router.replace('/login');
  }

  const primary = PRIMARY.filter(n => !n.roles || (user && n.roles.includes(user.role)));
  const masters = MASTERS.filter(n => !n.roles || (user && n.roles.includes(user.role)));

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-navy border-b border-navy-light">
        <div className="max-w-screen-2xl mx-auto px-3 lg:px-6 h-14 flex items-center gap-4">
          {/* Logo + brand */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Rainland Autocorp" className="h-8 w-auto brightness-0 invert" />
            <div className="hidden sm:block leading-tight">
              <div className="text-sm font-bold text-white tracking-wide">RAINLAND</div>
              <div className="text-[10px] text-navy-muted -mt-0.5">CRM · Montra · Isuzu</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5 ml-2 flex-1 overflow-x-auto">
            {primary.map(item => {
              const Icon = item.icon;
              const active = pathname?.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={cn('flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap',
                    active ? 'bg-white/20 text-white' : 'text-navy-muted hover:bg-white/10 hover:text-white')}>
                  <Icon size={15} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {masters.length > 0 && (
              <div className="relative" ref={mastersRef}>
                <button
                  onClick={() => setMastersOpen(v => !v)}
                  className={cn('flex items-center gap-1 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap',
                    masters.some(m => pathname?.startsWith(m.href))
                      ? 'bg-white/20 text-white'
                      : 'text-navy-muted hover:bg-white/10 hover:text-white')}>
                  Admin <ChevronDown size={14} className={cn('transition-transform', mastersOpen && 'rotate-180')} />
                </button>
                {mastersOpen && (
                  <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-40">
                    {masters.map(item => {
                      const Icon = item.icon;
                      const active = pathname?.startsWith(item.href);
                      return (
                        <Link key={item.href} href={item.href}
                          onClick={() => setMastersOpen(false)}
                          className={cn('flex items-center gap-2 px-3 py-2 text-sm',
                            active ? 'bg-brand/10 text-brand' : 'text-gray-700 hover:bg-gray-50')}>
                          <Icon size={15} /> {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          <div className="flex-1 lg:hidden" />

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(v => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/10">
              <div className="h-8 w-8 rounded-full bg-brand text-white flex items-center justify-center text-sm font-semibold">
                {(user?.name || '?').slice(0,1).toUpperCase()}
              </div>
              <div className="hidden md:block text-left leading-tight">
                <div className="text-sm font-medium text-white">{user?.name || '...'}</div>
                <div className="text-[11px] text-navy-muted">{user?.role}{user?.branch ? ' · '+user.branch : ''}</div>
              </div>
              <ChevronDown size={14} className="hidden md:block text-navy-muted" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-40">
                <div className="px-3 py-2 border-b">
                  <div className="text-sm font-medium">{user?.name}</div>
                  <div className="text-xs text-gray-500">{user?.email}</div>
                </div>
                <button onClick={logout}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  <LogOut size={15}/> Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-md hover:bg-white/10 text-white"
            aria-label="Open menu">
            <Menu size={20}/>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white p-3 flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3 pb-2 border-b">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={LOGO} alt="Rainland" className="h-7" />
                <span className="font-bold text-brand-dark">RAINLAND</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1 rounded hover:bg-gray-100"><X size={18}/></button>
            </div>
            <nav className="flex-1 overflow-y-auto">
              {primary.map(item => {
                const Icon = item.icon;
                const active = pathname?.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}
                    className={cn('flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-0.5',
                      active ? 'bg-brand text-white' : 'text-gray-700 hover:bg-gray-100')}>
                    <Icon size={16} /> {item.label}
                  </Link>
                );
              })}
              {masters.length > 0 && (
                <>
                  <div className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wider text-gray-400">Admin</div>
                  {masters.map(item => {
                    const Icon = item.icon;
                    const active = pathname?.startsWith(item.href);
                    return (
                      <Link key={item.href} href={item.href}
                        className={cn('flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-0.5',
                          active ? 'bg-brand text-white' : 'text-gray-700 hover:bg-gray-100')}>
                        <Icon size={16} /> {item.label}
                      </Link>
                    );
                  })}
                </>
              )}
            </nav>
            <button onClick={logout} className="btn btn-outline w-full mt-2"><LogOut size={14}/> Logout</button>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0">
        <div className="p-4 md:p-6 max-w-screen-2xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
