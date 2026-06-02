'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { getUser } from '@/lib/api';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Users, Car, FileText, Tag, Truck, TrendingUp,
  AlertCircle, Building2, CalendarCheck, Phone,
} from 'lucide-react';

const COLORS = ['#1d4ed8','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#22c55e','#14b8a6','#f97316','#3b82f6','#a855f7','#64748b'];

// ── Shared KPI card ───────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color }: { label:string; value:any; icon:any; color:string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2.5 rounded-xl ${color}`}><Icon size={18} className="opacity-80" /></div>
      </div>
      <div className="text-[26px] font-bold text-navy leading-none">{value}</div>
      <div className="text-[12px] font-medium text-[#64748B] mt-1.5 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function RangeBtn({ r, active, onClick }: { r:string; active:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} className={active ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}>
      {r}
    </button>
  );
}

// ── ADMIN / CRM_MANAGER / SALES_HEAD dashboard ────────────────────────────────
function AdminDashboard() {
  const [range, setRange] = useState<'daily'|'weekly'|'monthly'>('monthly');
  const [data, setData] = useState<any>(null);
  const [followups, setFollowups] = useState<any[]>([]);
  useEffect(() => { api(`/dashboard/overview?range=${range}`).then(setData).catch(()=>{}); }, [range]);
  useEffect(() => { api('/dashboard/followups').then(setFollowups).catch(()=>{}); }, []);
  if (!data) return <div className="py-20 text-center text-[#94A3B8]">Loading…</div>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-[26px] font-bold text-navy">Dashboard</h1><p className="text-[13px] text-[#64748B]">Organisation-wide performance overview</p></div>
        <div className="flex gap-2">
          {(['daily','weekly','monthly'] as const).map(r => <RangeBtn key={r} r={r} active={range===r} onClick={()=>setRange(r)}/>)}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total Leads"   value={data.totalLeads}        icon={Users}        color="bg-blue-50 text-blue-600"/>
        <KpiCard label="Test Drives"   value={data.testDrives}        icon={Car}          color="bg-purple-50 text-purple-600"/>
        <KpiCard label="Quotations"    value={data.quotations}        icon={FileText}     color="bg-amber-50 text-amber-600"/>
        <KpiCard label="Bookings"      value={data.bookings}          icon={Tag}          color="bg-indigo-50 text-indigo-600"/>
        <KpiCard label="Deliveries"    value={data.deliveries}        icon={Truck}        color="bg-green-50 text-green-600"/>
        <KpiCard label="Conversion %"  value={`${data.conversion}%`} icon={TrendingUp}   color="bg-rose-50 text-rose-600"/>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-navy mb-4">Leads by Status</h3>
          <div style={{ width:'100%', height:260 }}>
            <ResponsiveContainer>
              <BarChart data={data.byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                <XAxis dataKey="status" tick={{ fontSize:10 }} interval={0} angle={-20} textAnchor="end" height={60}/>
                <YAxis tick={{ fontSize:11 }}/>
                <Tooltip />
                <Bar dataKey="count" fill="#2563EB" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-navy mb-4">Leads by Branch</h3>
          <div style={{ width:'100%', height:260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.byBranch} dataKey="count" nameKey="branch" cx="50%" cy="50%" outerRadius={95} label>
                  {data.byBranch.map((_:any,i:number) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Legend wrapperStyle={{ fontSize:12 }}/>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-500"/>
          <h3 className="font-semibold text-navy text-[14px]">Pending Follow-ups <span className="text-[#94A3B8] font-normal">(no contact in 48 h)</span></h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Lead</th><th>Mobile</th><th>Branch</th><th>Assigned To</th><th>Status</th></tr></thead>
            <tbody>
              {followups.length===0 && <tr><td colSpan={5} className="text-center py-8 text-[#94A3B8]">All caught up ✓</td></tr>}
              {followups.map(l => (
                <tr key={l.id}><td className="font-medium text-navy">{l.name}</td><td>{l.mobile}</td>
                  <td>{l.branch?.name}</td><td>{l.assignedTo?.name||'—'}</td>
                  <td><span className="badge badge-yellow">{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── BRANCH_MANAGER dashboard ──────────────────────────────────────────────────
function BranchManagerDashboard({ user }: { user: any }) {
  const [range, setRange] = useState<'daily'|'weekly'|'monthly'>('monthly');
  const [data, setData]       = useState<any>(null);
  const [perf, setPerf]       = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  useEffect(() => { api(`/dashboard/overview?range=${range}`).then(setData).catch(()=>{}); }, [range]);
  useEffect(() => {
    api(`/dashboard/branch/${user.branchId}/performance`).then(setPerf).catch(()=>{});
    api('/dashboard/followups').then(setFollowups).catch(()=>{});
  }, [user.branchId]);
  if (!data) return <div className="py-20 text-center text-[#94A3B8]">Loading…</div>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold text-navy">Branch Dashboard</h1>
          <p className="text-[13px] text-[#64748B] flex items-center gap-1.5"><Building2 size={13}/>{user.branch || 'My Branch'}</p>
        </div>
        <div className="flex gap-2">
          {(['daily','weekly','monthly'] as const).map(r => <RangeBtn key={r} r={r} active={range===r} onClick={()=>setRange(r)}/>)}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Leads"        value={data.totalLeads}        icon={Users}      color="bg-blue-50 text-blue-600"/>
        <KpiCard label="Test Drives"  value={data.testDrives}        icon={Car}        color="bg-purple-50 text-purple-600"/>
        <KpiCard label="Quotations"   value={data.quotations}        icon={FileText}   color="bg-amber-50 text-amber-600"/>
        <KpiCard label="Bookings"     value={data.bookings}          icon={Tag}        color="bg-indigo-50 text-indigo-600"/>
        <KpiCard label="Deliveries"   value={data.deliveries}        icon={Truck}      color="bg-green-50 text-green-600"/>
      </div>
      {/* Exec performance */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F1F5F9]">
          <h3 className="font-semibold text-navy text-[14px]">Sales Executive Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Executive</th><th>Total Leads</th><th>Test Drives</th><th>Bookings</th><th>Deliveries</th></tr></thead>
            <tbody>
              {perf.length===0 && <tr><td colSpan={5} className="text-center py-8 text-[#94A3B8]">No executives in this branch</td></tr>}
              {perf.map((e:any) => (
                <tr key={e.id}>
                  <td className="font-medium text-navy">{e.name}</td>
                  <td>{e._count.assignedLeads}</td>
                  <td>{e._count.testDrives}</td>
                  <td>{e._count.bookings}</td>
                  <td>{e._count.deliveries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Pending follow-ups */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-500"/>
          <h3 className="font-semibold text-navy text-[14px]">Pending Follow-ups <span className="text-[#94A3B8] font-normal">(no contact in 48 h)</span></h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Lead</th><th>Mobile</th><th>Assigned To</th><th>Status</th></tr></thead>
            <tbody>
              {followups.length===0 && <tr><td colSpan={4} className="text-center py-8 text-[#94A3B8]">All caught up ✓</td></tr>}
              {followups.map(l => (
                <tr key={l.id}><td className="font-medium text-navy">{l.name}</td><td>{l.mobile}</td>
                  <td>{l.assignedTo?.name||'—'}</td><td><span className="badge badge-yellow">{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── SALES_EXECUTIVE / TEAM_LEADER dashboard ───────────────────────────────────
function ExecDashboard({ user }: { user: any }) {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { api('/dashboard/exec-stats').then(setStats).catch(()=>{}); }, []);
  if (!stats) return <div className="py-20 text-center text-[#94A3B8]">Loading…</div>;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold text-navy">My Dashboard</h1>
        <p className="text-[13px] text-[#64748B]">Welcome back, {user.name} — {user.role?.replace(/_/g,' ')}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Total Leads Assigned"  value={stats.totalLeads}  icon={Users}         color="bg-blue-50 text-blue-600"/>
        <KpiCard label="Leads (Last 30 Days)"  value={stats.myLeads}     icon={TrendingUp}    color="bg-indigo-50 text-indigo-600"/>
        <KpiCard label="Test Drives Conducted" value={stats.testDrives}  icon={Car}           color="bg-purple-50 text-purple-600"/>
      </div>
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-500"/>
          <h3 className="font-semibold text-navy text-[14px]">My Pending Follow-ups <span className="text-[#94A3B8] font-normal">(no contact in 48 h)</span></h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Lead Name</th><th>Mobile</th><th>Branch</th><th>Status</th></tr></thead>
            <tbody>
              {stats.pendingFollowups.length===0 && <tr><td colSpan={4} className="text-center py-8 text-[#94A3B8]">All caught up ✓</td></tr>}
              {stats.pendingFollowups.map((l:any) => (
                <tr key={l.id}><td className="font-medium text-navy">{l.name}</td><td>{l.mobile}</td>
                  <td>{l.branch?.name}</td><td><span className="badge badge-yellow">{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── CALL_CENTER dashboard ─────────────────────────────────────────────────────
function CallCenterDashboard({ user }: { user: any }) {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { api('/dashboard/exec-stats').then(setStats).catch(()=>{}); }, []);
  if (!stats) return <div className="py-20 text-center text-[#94A3B8]">Loading…</div>;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold text-navy">Call Centre Dashboard</h1>
        <p className="text-[13px] text-[#64748B]">Welcome, {user.name}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Total Leads"           value={stats.totalLeads} icon={Users}       color="bg-blue-50 text-blue-600"/>
        <KpiCard label="Leads (Last 30 Days)"  value={stats.myLeads}    icon={TrendingUp}  color="bg-indigo-50 text-indigo-600"/>
        <KpiCard label="Test Drives Scheduled" value={stats.testDrives} icon={CalendarCheck} color="bg-purple-50 text-purple-600"/>
      </div>
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center gap-2">
          <Phone size={16} className="text-brand"/>
          <h3 className="font-semibold text-navy text-[14px]">Leads Requiring Follow-up</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Lead Name</th><th>Mobile</th><th>Branch</th><th>Status</th></tr></thead>
            <tbody>
              {stats.pendingFollowups.length===0 && <tr><td colSpan={4} className="text-center py-8 text-[#94A3B8]">All caught up ✓</td></tr>}
              {stats.pendingFollowups.map((l:any) => (
                <tr key={l.id}><td className="font-medium text-navy">{l.name}</td><td>{l.mobile}</td>
                  <td>{l.branch?.name}</td><td><span className="badge badge-yellow">{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const user = getUser();
  const role = user?.role;

  if (role === 'BRANCH_MANAGER') return <BranchManagerDashboard user={user} />;
  if (role === 'SALES_EXECUTIVE' || role === 'TEAM_LEADER') return <ExecDashboard user={user} />;
  if (role === 'CALL_CENTER') return <CallCenterDashboard user={user} />;
  return <AdminDashboard />;
}