'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';

const C = ['#1d4ed8','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#22c55e','#14b8a6','#f97316'];

export default function ReportsPage() {
  const [src, setSrc] = useState<any[]>([]);
  const [br, setBr] = useState<any[]>([]);
  const [ex, setEx] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [lost, setLost] = useState<any[]>([]);
  const [wa, setWa] = useState<any>(null);

  useEffect(() => {
    api<any[]>('/reports/leads/by-source').then(setSrc);
    api<any[]>('/reports/leads/by-branch').then(setBr);
    api<any[]>('/reports/leads/by-executive').then(setEx);
    api<any[]>('/reports/sales/bookings').then(setBookings);
    api<any[]>('/reports/sales/deliveries').then(setDeliveries);
    api<any[]>('/reports/sales/lost-leads').then(setLost);
    api<any>('/reports/whatsapp/summary').then(setWa);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <section className="grid lg:grid-cols-3 gap-4">
        <Chart title="Leads by Source" data={src} k="source"/>
        <Chart title="Leads by Branch" data={br} k="branch"/>
        <Chart title="Leads by Executive" data={ex} k="executive"/>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Bookings ({bookings.length})</h3>
          <Table rows={bookings.map(b=>({ Number: b.number, Lead: b.lead.name, Branch: b.lead.branch?.name, Vehicle: `${b.vehicle.brand} ${b.vehicle.model}`, Date: new Date(b.bookingDate).toLocaleDateString(), Amount: b.bookingAmount }))}/>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Deliveries ({deliveries.length})</h3>
          <Table rows={deliveries.map(d=>({ Lead: d.lead.name, Branch: d.lead.branch?.name, Vehicle: `${d.vehicle.brand} ${d.vehicle.model}`, Date: new Date(d.deliveryDate).toLocaleDateString(), RegNo: d.registrationNo || '-' }))}/>
        </div>
      </section>

      <div className="card p-4">
        <h3 className="font-semibold mb-2">Lost Leads</h3>
        <Table rows={lost.map(l=>({ Name: l.name, Mobile: l.mobile, Branch: l.branch?.name, Source: l.source?.name, Vehicle: l.vehicle ? `${l.vehicle.brand} ${l.vehicle.model}` : '-', Assigned: l.assignedTo?.name || '-' }))}/>
      </div>

      {wa && (
        <div className="card p-4">
          <h3 className="font-semibold mb-2">WhatsApp Summary</h3>
          <div className="flex gap-6 mb-3">
            <div><div className="text-xs text-gray-500">Messages Sent</div><div className="text-2xl font-bold">{wa.sent}</div></div>
            <div><div className="text-xs text-gray-500">Replies Received</div><div className="text-2xl font-bold">{wa.received}</div></div>
          </div>
          <Table rows={wa.byCampaign.map((c: any)=>({ Campaign: c.campaign, Count: c.count }))}/>
        </div>
      )}
    </div>
  );
}

function Chart({ title, data, k }: { title: string; data: any[]; k: string }) {
  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div style={{ width:'100%', height: 240 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey={k} tick={{ fontSize: 10 }}/>
            <YAxis/>
            <Tooltip/>
            <Bar dataKey="count" fill="#1d4ed8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
function Table({ rows }: { rows: any[] }) {
  if (rows.length === 0) return <div className="text-sm text-gray-500">No data</div>;
  const cols = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{cols.map(c => <td key={c}>{String(r[c] ?? '')}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
