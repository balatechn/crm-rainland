'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import {
  FileText, BarChart3, CalendarCheck, TrendingUp, Target,
  Download, RefreshCw, Car, BookOpen, Truck,
} from 'lucide-react';

// ─── helpers ─────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().split('T')[0]; }
function thisMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}
function fmt(dt: string) {
  return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function exportCSV(rows: any[], filename: string) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  DONE:    'bg-green-100 text-green-700',
  MISSED:  'bg-red-100 text-red-700',
};

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

// ─── SimpleTable ──────────────────────────────────────────────────────────────
function SimpleTable({ rows, cols }: { rows: any[]; cols: { key: string; label: string }[] }) {
  if (!rows.length) return <div className="text-sm text-gray-400 py-6 text-center">No records found</div>;
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead><tr>{cols.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={i}>{cols.map(c => <td key={c.key}>{String(r[c.key] ?? '-')}</td>)}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// ─── Tab 1: Daily Summary ─────────────────────────────────────────────────────
function DailySummaryTab() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback((d: string) => {
    setLoading(true);
    api<any>(`/reports/daily?date=${d}`).then(setData).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  const leadsCSVRows = (data?.newLeads ?? []).map((l: any) => ({
    Name: l.name, Mobile: l.mobile, Email: l.email || '-', Branch: l.branch?.name || '-',
    Source: l.source?.name || '-', Status: l.status, AssignedTo: l.assignedTo?.name || '-',
    Created: fmtDate(l.createdAt),
  }));
  const tdCSVRows = (data?.testDrives ?? []).map((t: any) => ({
    Lead: t.lead?.name || '-', Mobile: t.lead?.mobile || '-',
    Vehicle: `${t.vehicle?.brand} ${t.vehicle?.model}`,
    Executive: t.executive?.name || '-', ScheduledAt: fmt(t.scheduledAt), Completed: t.completed ? 'Yes' : 'No',
  }));
  const displayDate = date ? fmtDate(date + 'T00:00:00') : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Select Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(leadsCSVRows, `leads-${date}.csv`)}
            className="btn-outline text-xs flex items-center gap-1.5 px-3 py-1.5">
            <Download size={13} /> Leads CSV
          </button>
          <button onClick={() => exportCSV(tdCSVRows, `test-drives-${date}.csv`)}
            className="btn-outline text-xs flex items-center gap-1.5 px-3 py-1.5">
            <Download size={13} /> TD CSV
          </button>
        </div>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={FileText}      label="New Leads"      value={data?.newLeadsCount   ?? 0} color="bg-blue-50 text-blue-600" />
            <StatCard icon={Car}           label="Test Drives"    value={data?.testDrivesCount ?? 0} color="bg-purple-50 text-purple-600" />
            <StatCard icon={BookOpen}      label="Bookings"       value={data?.bookingsCount   ?? 0} color="bg-green-50 text-green-600" />
            <StatCard icon={CalendarCheck} label="TD Stage Leads" value={data?.tdStageCount    ?? 0} color="bg-orange-50 text-orange-600" />
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileText size={15} className="text-blue-600" /> New Leads on {displayDate}
              </h3>
              <span className="text-xs text-gray-400">{data?.newLeads?.length ?? 0} records</span>
            </div>
            <SimpleTable
              rows={(data?.newLeads ?? []).map((l: any) => ({
                Name: l.name, Mobile: l.mobile, Branch: l.branch?.name || '-',
                Source: l.source?.name || '-', Status: l.status, AssignedTo: l.assignedTo?.name || '-',
              }))}
              cols={[
                { key: 'Name', label: 'Name' }, { key: 'Mobile', label: 'Mobile' },
                { key: 'Branch', label: 'Branch' }, { key: 'Source', label: 'Source' },
                { key: 'Status', label: 'Status' }, { key: 'AssignedTo', label: 'Assigned To' },
              ]}
            />
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Car size={15} className="text-purple-600" /> Test Drives Scheduled on {displayDate}
              </h3>
              <span className="text-xs text-gray-400">{data?.testDrives?.length ?? 0} records</span>
            </div>
            <SimpleTable
              rows={(data?.testDrives ?? []).map((t: any) => ({
                Lead: t.lead?.name || '-', Mobile: t.lead?.mobile || '-',
                Vehicle: `${t.vehicle?.brand} ${t.vehicle?.model}`,
                Executive: t.executive?.name || '-', Time: fmt(t.scheduledAt),
                Done: t.completed ? '✓ Done' : 'Pending',
              }))}
              cols={[
                { key: 'Lead', label: 'Lead' }, { key: 'Mobile', label: 'Mobile' },
                { key: 'Vehicle', label: 'Vehicle' }, { key: 'Executive', label: 'Executive' },
                { key: 'Time', label: 'Time' }, { key: 'Done', label: 'Status' },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab 2: Leads Report ──────────────────────────────────────────────────────
function LeadsReportTab() {
  const firstOfMonth = today().substring(0, 8) + '01';
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo]     = useState(today());
  const [src, setSrc]   = useState<any[]>([]);
  const [br, setBr]     = useState<any[]>([]);
  const [ex, setEx]     = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [deliveries, setDels]   = useState<any[]>([]);
  const [lost, setLost]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api<any[]>('/reports/leads/by-source'),
      api<any[]>('/reports/leads/by-branch'),
      api<any[]>('/reports/leads/by-executive'),
      api<any[]>(`/reports/sales/bookings?from=${from}&to=${to}`),
      api<any[]>(`/reports/sales/deliveries?from=${from}&to=${to}`),
      api<any[]>('/reports/sales/lost-leads'),
    ]).then(([s, b, e, bk, dl, ls]) => {
      setSrc(s); setBr(b); setEx(e); setBookings(bk); setDels(dl); setLost(ls);
    }).finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
        </div>
        <button onClick={load} className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-sm">
          <RefreshCw size={14} /> Apply
        </button>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <>
          <div className="grid lg:grid-cols-3 gap-4">
            {[
              { title: 'Leads by Source',    data: src, key: 'source' },
              { title: 'Leads by Branch',    data: br,  key: 'branch' },
              { title: 'Leads by Executive', data: ex,  key: 'executive' },
            ].map(({ title, data, key }) => (
              <div key={title} className="card p-4">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">{title}</h3>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 4, right: 8, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey={key} tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <BookOpen size={15} className="text-green-600" /> Bookings
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{bookings.length} records</span>
                  <button onClick={() => exportCSV(bookings.map(b => ({
                    Number: b.number, Lead: b.lead.name, Branch: b.lead.branch?.name,
                    Vehicle: `${b.vehicle.brand} ${b.vehicle.model}`, Date: fmtDate(b.bookingDate), Amount: b.bookingAmount,
                  })), 'bookings.csv')} className="text-xs text-brand hover:underline flex items-center gap-1">
                    <Download size={12} /> CSV
                  </button>
                </div>
              </div>
              <SimpleTable
                rows={bookings.map(b => ({
                  Number: b.number, Lead: b.lead.name, Branch: b.lead.branch?.name || '-',
                  Vehicle: `${b.vehicle.brand} ${b.vehicle.model}`, Date: fmtDate(b.bookingDate),
                  Amount: `₹${Number(b.bookingAmount).toLocaleString('en-IN')}`,
                }))}
                cols={[
                  { key: 'Number', label: '#' }, { key: 'Lead', label: 'Lead' },
                  { key: 'Branch', label: 'Branch' }, { key: 'Vehicle', label: 'Vehicle' },
                  { key: 'Date', label: 'Date' }, { key: 'Amount', label: 'Amount' },
                ]}
              />
            </div>
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Truck size={15} className="text-blue-600" /> Deliveries
                </h3>
                <span className="text-xs text-gray-400">{deliveries.length} records</span>
              </div>
              <SimpleTable
                rows={deliveries.map(d => ({
                  Lead: d.lead.name, Branch: d.lead.branch?.name || '-',
                  Vehicle: `${d.vehicle.brand} ${d.vehicle.model}`, Date: fmtDate(d.deliveryDate),
                  RegNo: d.registrationNo || '-',
                }))}
                cols={[
                  { key: 'Lead', label: 'Lead' }, { key: 'Branch', label: 'Branch' },
                  { key: 'Vehicle', label: 'Vehicle' }, { key: 'Date', label: 'Date' },
                  { key: 'RegNo', label: 'Reg No' },
                ]}
              />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Lost Leads</h3>
              <span className="text-xs text-gray-400">{lost.length} records</span>
            </div>
            <SimpleTable
              rows={lost.map(l => ({
                Name: l.name, Mobile: l.mobile, Branch: l.branch?.name || '-',
                Source: l.source?.name || '-', Vehicle: l.vehicle ? `${l.vehicle.brand} ${l.vehicle.model}` : '-',
                AssignedTo: l.assignedTo?.name || '-',
              }))}
              cols={[
                { key: 'Name', label: 'Name' }, { key: 'Mobile', label: 'Mobile' },
                { key: 'Branch', label: 'Branch' }, { key: 'Source', label: 'Source' },
                { key: 'Vehicle', label: 'Vehicle' }, { key: 'AssignedTo', label: 'Assigned To' },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab 3: Follow-up Report ──────────────────────────────────────────────────
function FollowUpReportTab() {
  const firstOfMonth = today().substring(0, 8) + '01';
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo]     = useState(today());
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api<any[]>(`/reports/follow-ups?from=${from}&to=${to}`).then(setRows).finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const csvRows = rows.map(r => ({
    Lead: r.lead?.name || '-', Mobile: r.lead?.mobile || '-', Branch: r.lead?.branch?.name || '-',
    Type: r.type, ScheduledAt: fmt(r.scheduledAt), Executive: r.user?.name || '-',
    Status: r.status, Note: r.note || '-',
  }));
  const summary = rows.reduce((acc: any, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
        </div>
        <button onClick={load} className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-sm">
          <RefreshCw size={14} /> Apply
        </button>
        <button onClick={() => exportCSV(csvRows, `follow-ups-${from}-${to}.csv`)}
          className="btn-outline flex items-center gap-1.5 px-3 py-1.5 text-sm">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        {Object.entries(summary).map(([status, count]: any) => (
          <div key={status} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${STATUS_COLOR[status] || 'bg-gray-100 text-gray-600'}`}>
            {status}: {count}
          </div>
        ))}
        {rows.length > 0 && <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">Total: {rows.length}</div>}
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <div className="card p-4">
          <SimpleTable
            rows={rows.map(r => ({
              Lead: r.lead?.name || '-', Mobile: r.lead?.mobile || '-',
              Branch: r.lead?.branch?.name || '-', Type: r.type,
              ScheduledAt: fmt(r.scheduledAt), Executive: r.user?.name || '-',
              Status: r.status, Note: r.note || '-',
            }))}
            cols={[
              { key: 'Lead', label: 'Lead' }, { key: 'Mobile', label: 'Mobile' },
              { key: 'Branch', label: 'Branch' }, { key: 'Type', label: 'Type' },
              { key: 'ScheduledAt', label: 'Scheduled At' }, { key: 'Executive', label: 'Executive' },
              { key: 'Status', label: 'Status' }, { key: 'Note', label: 'Note' },
            ]}
          />
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: Performance Report ────────────────────────────────────────────────
function PerformanceReportTab() {
  const firstOfMonth = today().substring(0, 8) + '01';
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo]     = useState(today());
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api<any[]>(`/reports/performance?from=${from}&to=${to}`)
      .then(r => setRows(r.filter((u: any) => u.leads + u.testDrives + u.bookings + u.deliveries + u.followUps > 0)))
      .finally(() => setLoading(false));
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const chartData = rows.map(r => ({ name: r.name.split(' ')[0], leads: r.leads, testDrives: r.testDrives, bookings: r.bookings }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
        </div>
        <button onClick={load} className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-sm">
          <RefreshCw size={14} /> Apply
        </button>
        <button onClick={() => exportCSV(rows, `performance-${from}-${to}.csv`)}
          className="btn-outline flex items-center gap-1.5 px-3 py-1.5 text-sm">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <>
          {chartData.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">Activity Overview</h3>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="leads"      name="Leads"       fill="#1d4ed8" radius={[3,3,0,0]} />
                    <Bar dataKey="testDrives" name="Test Drives" fill="#8b5cf6" radius={[3,3,0,0]} />
                    <Bar dataKey="bookings"   name="Bookings"    fill="#10b981" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">Team Performance</h3>
              <span className="text-xs text-gray-400">{rows.length} active members</span>
            </div>
            <SimpleTable
              rows={rows.map(r => ({
                Executive: r.name, Role: r.role.replace(/_/g, ' '), Branch: r.branch,
                Leads: r.leads, TestDrives: r.testDrives, Bookings: r.bookings,
                Deliveries: r.deliveries, FollowUps: r.followUps,
              }))}
              cols={[
                { key: 'Executive', label: 'Executive' }, { key: 'Role', label: 'Role' },
                { key: 'Branch', label: 'Branch' }, { key: 'Leads', label: 'Leads' },
                { key: 'TestDrives', label: 'Test Drives' }, { key: 'Bookings', label: 'Bookings' },
                { key: 'Deliveries', label: 'Deliveries' }, { key: 'FollowUps', label: 'Follow-Ups' },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab 5: Monthly Target ────────────────────────────────────────────────────
function MonthlyTargetTab() {
  const [month, setMonth] = useState(thisMonth());
  const [data, setData]   = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback((m: string) => {
    setLoading(true);
    api<any>(`/reports/monthly?month=${m}`).then(setData).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(month); }, [month, load]);

  const kpis = data ? [
    { icon: FileText,      label: 'Total Leads',  value: data.leads,      color: 'bg-blue-50 text-blue-600' },
    { icon: Car,           label: 'Test Drives',  value: data.testDrives, color: 'bg-purple-50 text-purple-600' },
    { icon: BookOpen,      label: 'Bookings',     value: data.bookings,   color: 'bg-green-50 text-green-600' },
    { icon: Truck,         label: 'Deliveries',   value: data.deliveries, color: 'bg-teal-50 text-teal-600' },
    { icon: CalendarCheck, label: 'Follow-Ups',   value: data.followUps,  color: 'bg-yellow-50 text-yellow-600' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Month</label>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {kpis.map(k => <StatCard key={k.label} icon={k.icon} label={k.label} value={k.value} color={k.color} />)}
          </div>

          {data.leads > 0 && (
            <div className="card p-4 flex flex-wrap gap-8">
              <div>
                <div className="text-xs text-gray-500 mb-0.5">TD Conversion</div>
                <div className="text-2xl font-bold text-purple-600">{((data.testDrives / data.leads) * 100).toFixed(1)}%</div>
                <div className="text-xs text-gray-400">Leads → Test Drives</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Booking Conversion</div>
                <div className="text-2xl font-bold text-green-600">{((data.bookings / data.leads) * 100).toFixed(1)}%</div>
                <div className="text-xs text-gray-400">Leads → Bookings</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Delivery Rate</div>
                <div className="text-2xl font-bold text-teal-600">
                  {data.bookings > 0 ? ((data.deliveries / data.bookings) * 100).toFixed(1) : 0}%
                </div>
                <div className="text-xs text-gray-400">Bookings → Deliveries</div>
              </div>
            </div>
          )}

          {data.weeks?.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">Weekly Breakdown</h3>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weeks} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="leads"      name="Leads"       fill="#1d4ed8" radius={[3,3,0,0]} />
                    <Bar dataKey="testDrives" name="Test Drives" fill="#8b5cf6" radius={[3,3,0,0]} />
                    <Bar dataKey="bookings"   name="Bookings"    fill="#10b981" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <SimpleTable
                  rows={data.weeks.map((w: any) => ({ Week: w.week, Leads: w.leads, 'Test Drives': w.testDrives, Bookings: w.bookings }))}
                  cols={[
                    { key: 'Week', label: 'Week' }, { key: 'Leads', label: 'Leads' },
                    { key: 'Test Drives', label: 'Test Drives' }, { key: 'Bookings', label: 'Bookings' },
                  ]}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'daily',       label: 'Daily Summary',     icon: FileText },
  { id: 'leads',       label: 'Leads Report',       icon: BarChart3 },
  { id: 'followups',   label: 'Follow-up Report',   icon: CalendarCheck },
  { id: 'performance', label: 'Performance Report', icon: TrendingUp },
  { id: 'monthly',     label: 'Monthly Target',     icon: Target },
];

export default function ReportsPage() {
  const [tab, setTab] = useState('daily');

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BarChart3 size={22} className="text-brand" />
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 -mx-4 px-4 md:-mx-6 md:px-6">
        <div className="flex gap-1 overflow-x-auto pb-px">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                  ${active
                    ? 'border-brand text-brand bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        {tab === 'daily'       && <DailySummaryTab />}
        {tab === 'leads'       && <LeadsReportTab />}
        {tab === 'followups'   && <FollowUpReportTab />}
        {tab === 'performance' && <PerformanceReportTab />}
        {tab === 'monthly'     && <MonthlyTargetTab />}
      </div>
    </div>
  );
}
