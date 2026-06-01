'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#1d4ed8','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#22c55e','#14b8a6','#f97316','#3b82f6','#a855f7','#64748b'];

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-gray-500 uppercase">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [range, setRange] = useState<'daily'|'weekly'|'monthly'>('monthly');
  const [data, setData] = useState<any>(null);
  const [followups, setFollowups] = useState<any[]>([]);

  useEffect(() => {
    api(`/dashboard/overview?range=${range}`).then(setData).catch(()=>{});
    api('/dashboard/followups').then(setFollowups).catch(()=>{});
  }, [range]);

  if (!data) return <div>Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          {(['daily','weekly','monthly'] as const).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`btn ${range===r?'btn-primary':'btn-outline'}`}>{r}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat label="Total Leads" value={data.totalLeads} />
        <Stat label="Test Drives" value={data.testDrives} />
        <Stat label="Quotations" value={data.quotations} />
        <Stat label="Bookings" value={data.bookings} />
        <Stat label="Deliveries" value={data.deliveries} />
        <Stat label="Conversion %" value={`${data.conversion}%`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold mb-3">Leads by Status</h3>
          <div style={{ width:'100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={data.byStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70}/>
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1d4ed8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-3">Leads by Branch</h3>
          <div style={{ width:'100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.byBranch} dataKey="count" nameKey="branch" cx="50%" cy="50%" outerRadius={100} label>
                  {data.byBranch.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold mb-3">Pending Follow-ups (no contact in 48h)</h3>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Lead</th><th>Mobile</th><th>Branch</th><th>Assigned</th><th>Status</th></tr></thead>
            <tbody>
              {followups.length === 0 && <tr><td colSpan={5} className="text-center text-gray-500 py-4">All caught up</td></tr>}
              {followups.map(l => (
                <tr key={l.id}>
                  <td>{l.name}</td><td>{l.mobile}</td>
                  <td>{l.branch?.name}</td>
                  <td>{l.assignedTo?.name || '-'}</td>
                  <td>{l.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
