'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Phone, FileText, Car, Building2,
  CalendarCheck, ClipboardList, Truck, MessageCircle, BarChart3,
  LogOut, Menu, X, Tag, ShieldCheck, History,
} from 'lucide-react';
import { getToken, getUser, setToken, setUser } from '@/lib/api';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string; icon: any; roles?: string[] };

const NAV: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/leads',        label: 'Leads',         icon: Users },
  { href: '/pipeline',     label: 'Pipeline',      icon: ClipboardList },
  { href: '/test-drives',  label: 'Test Drives',   icon: CalendarCheck },
  { href: '/quotations',   label: 'Quotations',    icon: FileText },
  { href: '/bookings',     label: 'Bookings',      icon: Tag },
  { href: '/deliveries',   label: 'Deliveries',    icon: Truck },
  { href: '/whatsapp',     label: 'WhatsApp',      icon: MessageCircle },
  { href: '/reports',      label: 'Reports',       icon: BarChart3 },
  { href: '/masters/branches', label: 'Branches',  icon: Building2, roles: ['ADMIN','CRM_MANAGER','SALES_HEAD'] },
  { href: '/masters/vehicles', label: 'Vehicles',  icon: Car,       roles: ['ADMIN','CRM_MANAGER','SALES_HEAD'] },
  { href: '/masters/sources',  label: 'Lead Sources', icon: Phone,  roles: ['ADMIN','CRM_MANAGER','SALES_HEAD'] },
  { href: '/users',        label: 'Users',         icon: ShieldCheck, roles: ['ADMIN','CRM_MANAGER'] },
  { href: '/audit',        label: 'Audit Logs',    icon: History,     roles: ['ADMIN','CRM_MANAGER'] },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setU] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) { router.replace('/login'); return; }
    setU(getUser());
  }, [router]);

  function logout() {
    setToken(null); setUser(null); router.replace('/login');
  }

  const items = NAV.filter(n => !n.roles || (user && n.roles.includes(user.role)));

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex md:w-60 flex-col bg-white border-r border-gray-200">
        <div className="p-4 border-b">
          <div className="text-lg font-bold text-brand">Rainland CRM</div>
          <div className="text-xs text-gray-500">Montra · Isuzu</div>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto">
          {items.map(item => {
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
        </nav>
        <div className="p-3 border-t">
          <div className="text-sm font-medium">{user?.name}</div>
          <div className="text-xs text-gray-500">{user?.role} {user?.branch ? '· '+user.branch : ''}</div>
          <button onClick={logout} className="btn btn-outline w-full mt-2"><LogOut size={14}/> Logout</button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-white border-b flex items-center justify-between px-3 py-2">
        <div className="text-base font-bold text-brand">Rainland CRM</div>
        <button onClick={() => setOpen(true)} className="p-2 rounded hover:bg-gray-100"><Menu size={20}/></button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white p-3 flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-base font-bold text-brand">Rainland CRM</div>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100"><X size={18}/></button>
            </div>
            <nav className="flex-1 overflow-y-auto">
              {items.map(item => {
                const Icon = item.icon;
                const active = pathname?.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                    className={cn('flex items-center gap-3 px-3 py-2 rounded-md text-sm mb-0.5',
                      active ? 'bg-brand text-white' : 'text-gray-700 hover:bg-gray-100')}>
                    <Icon size={16} /> {item.label}
                  </Link>
                );
              })}
            </nav>
            <button onClick={logout} className="btn btn-outline w-full mt-2"><LogOut size={14}/> Logout</button>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 md:pt-0 pt-12">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
