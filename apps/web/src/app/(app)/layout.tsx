'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard, Users, Phone, FileText, Car, Building2,
  CalendarCheck, ClipboardList, Truck, MessageCircle, BarChart3,
  LogOut, Menu, X, Tag, ShieldCheck, History, ChevronDown,
  Bell, Search, UserCircle, Landmark, Store, BellRing,
} from 'lucide-react';
import { getToken, getUser, setToken, setUser, api } from '@/lib/api';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string; icon?: any; roles?: string[] };

const SALES_ITEMS: NavItem[] = [
  { href: '/leads',       label: 'Leads',       icon: Users },
  { href: '/walk-ins',    label: 'Walk-Ins',     icon: Store },
  { href: '/follow-ups',  label: 'Follow-Ups',   icon: BellRing },
  { href: '/test-drives', label: 'Test Drives',  icon: CalendarCheck },
  { href: '/pipeline',    label: 'Pipeline',     icon: ClipboardList },
];
const OPERATIONS_ITEMS: NavItem[] = [
  { href: '/quotations',  label: 'Quotations',   icon: FileText },
  { href: '/bookings',    label: 'Bookings',     icon: Tag },
  { href: '/finance',     label: 'Finance',      icon: Landmark },
  { href: '/deliveries',  label: 'Deliveries',   icon: Truck },
];
const INTELLIGENCE_ITEMS: NavItem[] = [
  { href: '/reports',     label: 'Reports',      icon: BarChart3 },
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
];
const ADMIN_ITEMS: NavItem[] = [
  { href: '/masters/branches', label: 'Branches',     icon: Building2,   roles: ['ADMIN','CRM_MANAGER','SALES_HEAD'] },
  { href: '/masters/vehicles', label: 'Vehicles',     icon: Car,         roles: ['ADMIN','CRM_MANAGER','SALES_HEAD'] },
  { href: '/masters/sources',  label: 'Lead Sources', icon: Phone,       roles: ['ADMIN','CRM_MANAGER','SALES_HEAD'] },
  { href: '/users',            label: 'Users',        icon: ShieldCheck, roles: ['ADMIN','CRM_MANAGER'] },
  { href: '/audit',            label: 'Audit Logs',   icon: History,     roles: ['ADMIN','CRM_MANAGER'] },
];

// ── Dropdown ──────────────────────────────────────────────────────────────────
function DropdownMenu({ label, items, pathname, user, onNav }: {
  label: string; items: NavItem[]; pathname: string | null; user: any; onNav?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = items.filter(n => !n.roles || (user && n.roles.includes(user.role)));
  const isActive  = filtered.some(n => pathname?.startsWith(n.href));

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (!filtered.length) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-1 px-3.5 h-[70px] text-[13px] font-medium whitespace-nowrap transition-all duration-150 border-b-2',
          isActive
            ? 'text-white border-[#2563EB]'
            : 'text-slate-400 border-transparent hover:text-white hover:border-white/30'
        )}
      >
        {label}
        <ChevronDown size={12} className={cn('transition-transform duration-200 mt-0.5', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-0 min-w-[220px] bg-white border border-[#E2E8F0] rounded-2xl shadow-lift py-2 z-50 animate-fade-in">
          {filtered.map(item => {
            const Icon = item.icon;
            const active = pathname?.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                onClick={() => { setOpen(false); onNav?.(); }}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors duration-100 mx-1.5 rounded-xl',
                  active ? 'bg-brand/8 text-brand font-semibold' : 'text-[#374151] hover:bg-[#F8FAFC]'
                )}
              >
                {Icon && <Icon size={15} className={active ? 'text-brand' : 'text-[#94A3B8]'} />}
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main layout ───────────────────────────────────────────────────────────────
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user,        setU]          = useState<any>(null);
  const [mobileOpen,  setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen]= useState(false);
  const [searchOpen,  setSearchOpen] = useState(false);
  const [onlineOpen,  setOnlineOpen] = useState(false);
  const [onlineUsers, setOnlineUsers]= useState<any[]>([]);
  const [searchVal,   setSearchVal]  = useState('');
  const profileRef = useRef<HTMLDivElement>(null);
  const onlineRef  = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!getToken()) { router.replace('/login'); return; }
    setU(getUser());
  }, [router]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (onlineRef.current  && !onlineRef.current.contains(e.target as Node))  setOnlineOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function openOnlineUsers() {
    if (!onlineOpen) api<any[]>('/users').then(l => setOnlineUsers((l||[]).filter((u: any) => u.active)));
    setOnlineOpen(v => !v);
  }

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  function logout() { setToken(null); setUser(null); router.replace('/login'); }

  const isDash     = pathname === '/dashboard';
  const isWhatsApp = pathname?.startsWith('/whatsapp');
  const ROLE_SHORT: Record<string,string> = {
    ADMIN:'Admin', CRM_MANAGER:'CRM Mgr', CALL_CENTER:'Call Ctr',
    SALES_HEAD:'Sales Head', BRANCH_MANAGER:'Br. Mgr', SALES_EXECUTIVE:'Exec', TEAM_LEADER:'TL',
  };

  const navLink = (href: string, label: string, Icon: any, exact = false) => {
    const active = exact ? pathname === href : pathname?.startsWith(href);
    return (
      <Link href={href}
        className={cn(
          'flex items-center gap-2 px-3.5 h-[70px] text-[13px] font-medium whitespace-nowrap transition-all duration-150 border-b-2',
          active ? 'text-white border-[#2563EB]' : 'text-slate-400 border-transparent hover:text-white hover:border-white/30'
        )}
      >
        <Icon size={15} />
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#0F172A] border-b border-white/[.07]" style={{ height: 70 }}>
        <div className="max-w-screen-2xl mx-auto px-5 lg:px-8 h-full flex items-center gap-2">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 mr-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://rainlandautocorp.com/logo.png" alt="Rainland Auto Corp" className="h-9 w-auto object-contain" />
            <span className="hidden sm:inline text-[10px] font-bold bg-[#2563EB33] text-[#3B82F6] px-2 py-0.5 rounded-md tracking-widest">CRM</span>
          </Link>

          {/* Vertical divider */}
          <div className="hidden lg:block h-6 w-px bg-white/10 mr-1" />

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center flex-1">
            {navLink('/dashboard', 'Dashboard', LayoutDashboard, true)}
            {navLink('/whatsapp',  'WhatsApp',  MessageCircle)}
            <DropdownMenu label="Sales"        items={SALES_ITEMS}        pathname={pathname} user={user} />
            <DropdownMenu label="Operations"   items={OPERATIONS_ITEMS}   pathname={pathname} user={user} />
            <DropdownMenu label="Reports"      items={INTELLIGENCE_ITEMS} pathname={pathname} user={user} />
            <DropdownMenu label="Admin"        items={ADMIN_ITEMS}        pathname={pathname} user={user} />
          </nav>

          <div className="flex-1 lg:hidden" />

          {/* Right actions */}
          <div className="flex items-center gap-0.5">

            {/* Search */}
            {searchOpen ? (
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5 mr-1" ref={searchRef as any}>
                <Search size={15} className="text-slate-400 shrink-0" />
                <input
                  autoFocus
                  value={searchVal}
                  onChange={e => setSearchVal(e.target.value)}
                  placeholder="Search leads, customers…"
                  onBlur={() => { setSearchOpen(false); setSearchVal(''); }}
                  onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)}
                  className="bg-transparent text-white text-[13px] placeholder:text-slate-500 outline-none w-52"
                />
                <button onClick={() => setSearchOpen(false)} className="text-slate-500 hover:text-white"><X size={14} /></button>
              </div>
            ) : (
              <button onClick={() => setSearchOpen(true)}
                className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-all duration-150"
                aria-label="Search">
                <Search size={17} />
              </button>
            )}

            {/* Online users — Admin only */}
            {user?.role === 'ADMIN' && (
              <div className="relative" ref={onlineRef}>
                <button onClick={openOnlineUsers}
                  className="relative p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-all duration-150"
                  aria-label="Active users">
                  <Users size={17} />
                  <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-green-400" />
                </button>
                {onlineOpen && (
                  <div className="absolute right-0 top-full mt-2 w-68 bg-white border border-[#E2E8F0] rounded-2xl shadow-modal py-2 z-50 animate-fade-in" style={{width:260}}>
                    <div className="px-4 pb-2 pt-1 border-b border-[#F1F5F9] flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Active Users</span>
                      <span className="text-[11px] bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded-full">{onlineUsers.length}</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {onlineUsers.length === 0 && <p className="px-4 py-3 text-sm text-[#94A3B8]">No active users</p>}
                      {onlineUsers.map(u => (
                        <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFC] mx-1 rounded-xl transition-colors">
                          <div className="h-8 w-8 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-semibold text-navy truncate">{u.name}</div>
                            <div className="text-[11px] text-[#94A3B8]">{u.role.replace(/_/g,' ')}{u.branch ? ` · ${u.branch.name}` : ''}</div>
                          </div>
                          <span className="h-2 w-2 rounded-full bg-green-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notifications */}
            <button className="relative p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-all duration-150" aria-label="Notifications">
              <Bell size={17} />
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-white/10 mx-1" />

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button onClick={() => setProfileOpen(v => !v)}
                className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl hover:bg-white/8 transition-all duration-150">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand to-blue-400 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {(user?.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left leading-tight">
                  <div className="text-[13px] font-semibold text-white">{(user?.name||'').split(' ')[0]}</div>
                  <div className="text-[10px] text-slate-500">{ROLE_SHORT[user?.role] ?? user?.role ?? ''}</div>
                </div>
                <ChevronDown size={12} className={cn('hidden md:block text-slate-500 transition-transform duration-200', profileOpen && 'rotate-180')} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-[#E2E8F0] rounded-2xl shadow-modal py-2 z-50 animate-fade-in">
                  <div className="px-4 py-3 border-b border-[#F1F5F9]">
                    <div className="text-[13px] font-semibold text-navy">{user?.name}</div>
                    <div className="text-[11px] text-[#94A3B8] mt-0.5">{user?.email}</div>
                  </div>
                  <Link href="/profile" onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#374151] hover:bg-[#F8FAFC] mx-1 rounded-xl transition-colors">
                    <UserCircle size={15} className="text-[#94A3B8]" /> My Profile
                  </Link>
                  <div className="mx-3 my-1 border-t border-[#F1F5F9]" />
                  <button onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#EF4444] hover:bg-red-50 mx-1 rounded-xl transition-colors" style={{width:'calc(100% - 8px)'}}>
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition-all ml-1"
              aria-label="Menu">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ─────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-modal animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
              <span className="text-lg font-extrabold text-[#E53935] tracking-tight">RAINLAND</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {[
                { href:'/dashboard', label:'Dashboard', Icon:LayoutDashboard },
                { href:'/whatsapp',  label:'WhatsApp',  Icon:MessageCircle  },
              ].map(({ href, label, Icon }) => (
                <Link key={href} href={href}
                  className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors',
                    pathname?.startsWith(href) ? 'bg-navy text-white' : 'text-[#374151] hover:bg-[#F8FAFC]')}>
                  <Icon size={16} /> {label}
                </Link>
              ))}
              {[
                { label:'Sales',        items:SALES_ITEMS },
                { label:'Operations',   items:OPERATIONS_ITEMS },
                { label:'Reports',      items:INTELLIGENCE_ITEMS },
                { label:'Admin',        items:ADMIN_ITEMS },
              ].map(({ label, items }) => {
                const filtered = items.filter(n => !n.roles || (user && n.roles.includes(user.role)));
                if (!filtered.length) return null;
                return (
                  <div key={label}>
                    <div className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-widest font-semibold text-[#94A3B8]">{label}</div>
                    {filtered.map(item => {
                      const Icon = item.icon;
                      const active = pathname?.startsWith(item.href);
                      return (
                        <Link key={item.href} href={item.href}
                          className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-colors',
                            active ? 'bg-brand/10 text-brand font-semibold' : 'text-[#374151] hover:bg-[#F8FAFC]')}>
                          {Icon && <Icon size={15} className={active ? 'text-brand':'text-[#94A3B8]'} />} {item.label}
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </nav>
            <div className="p-3 border-t border-[#F1F5F9] space-y-1">
              <Link href="/profile" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-[#374151] hover:bg-[#F8FAFC]">
                <UserCircle size={15} className="text-[#94A3B8]" /> My Profile
              </Link>
              <button onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-[#EF4444] hover:bg-red-50">
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page content ──────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
          {children}
        </div>
      </main>

    </div>
  );
}
