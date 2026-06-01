'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { inr } from '@/lib/utils';

export default function BookingsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ leadId:'', vehicleId:'', bookingAmount:0, bookingDate:'', paymentMethod:'CASH', financeOption:'' });
  const [leads, setLeads] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  async function load() { setItems(await api('/bookings')); }
  useEffect(() => { load(); api<any[]>('/leads').then(setLeads); api<any[]>('/vehicles').then(setVehicles); }, []);

  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }
  async function save() {
    await api('/bookings', { method:'POST', body: JSON.stringify(form) });
    setOpen(false); load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <button className="btn btn-primary" onClick={()=>setOpen(true)}>+ New Booking</button>
      </div>

      {open && (
        <div className="card p-4 grid md:grid-cols-3 gap-2">
          <select className="select" value={form.leadId} onChange={e=>set('leadId', e.target.value)}>
            <option value="">Lead</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.name} ({l.mobile})</option>)}
          </select>
          <select className="select" value={form.vehicleId} onChange={e=>set('vehicleId', e.target.value)}>
            <option value="">Vehicle</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model}</option>)}
          </select>
          <input className="input" type="number" placeholder="Booking Amount" value={form.bookingAmount} onChange={e=>set('bookingAmount', Number(e.target.value))} />
          <input className="input" type="date" value={form.bookingDate} onChange={e=>set('bookingDate', e.target.value)} />
          <select className="select" value={form.paymentMethod} onChange={e=>set('paymentMethod', e.target.value)}>
            {['CASH','CARD','UPI','BANK','FINANCE'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <input className="input" placeholder="Finance Option (optional)" value={form.financeOption} onChange={e=>set('financeOption', e.target.value)} />
          <div className="md:col-span-3 flex justify-end gap-2">
            <button className="btn btn-outline" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save</button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Number</th><th>Date</th><th>Lead</th><th>Branch</th><th>Vehicle</th><th>Amount</th><th>Payment</th><th>Delivered?</th></tr></thead>
          <tbody>
            {items.map(b => (
              <tr key={b.id}>
                <td>{b.number}</td>
                <td>{new Date(b.bookingDate).toLocaleDateString()}</td>
                <td><Link className="text-brand hover:underline" href={`/leads/${b.lead.id}`}>{b.lead.name}</Link></td>
                <td>{b.lead.branch?.name}</td>
                <td>{b.vehicle.brand} {b.vehicle.model}</td>
                <td>{inr(b.bookingAmount)}</td>
                <td>{b.paymentMethod}{b.financeOption?` (${b.financeOption})`:''}</td>
                <td>{b.delivery ? '✓' : '—'}</td>
              </tr>
            ))}
            {items.length===0 && <tr><td colSpan={8} className="text-center text-gray-500 py-4">No bookings</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
