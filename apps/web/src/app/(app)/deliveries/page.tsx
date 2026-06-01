'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function DeliveriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ bookingId:'', deliveryDate:'', registrationNo:'', customerFeedback:'', photos:[] });

  async function load() {
    setItems(await api('/deliveries'));
    setBookings(await api<any[]>('/bookings'));
  }
  useEffect(() => { load(); }, []);

  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }
  async function save() {
    await api('/deliveries', { method:'POST', body: JSON.stringify({ ...form, photos: form.photos.filter(Boolean) }) });
    setOpen(false); load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Deliveries</h1>
        <button className="btn btn-primary" onClick={()=>setOpen(true)}>+ Record Delivery</button>
      </div>

      {open && (
        <div className="card p-4 grid md:grid-cols-2 gap-2">
          <select className="select" value={form.bookingId} onChange={e=>set('bookingId', e.target.value)}>
            <option value="">Booking</option>
            {bookings.filter(b => !b.delivery).map(b => <option key={b.id} value={b.id}>{b.number} — {b.lead.name}</option>)}
          </select>
          <input className="input" type="date" value={form.deliveryDate} onChange={e=>set('deliveryDate', e.target.value)} />
          <input className="input" placeholder="Registration Number" value={form.registrationNo} onChange={e=>set('registrationNo', e.target.value)} />
          <input className="input" placeholder="Photo URL (comma separated)"
            value={form.photos.join(',')}
            onChange={e=>set('photos', e.target.value.split(',').map((s: string)=>s.trim()))} />
          <textarea className="textarea md:col-span-2" rows={2} placeholder="Customer feedback" value={form.customerFeedback} onChange={e=>set('customerFeedback', e.target.value)} />
          <div className="md:col-span-2 flex justify-end gap-2">
            <button className="btn btn-outline" onClick={()=>setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>Save</button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Date</th><th>Lead</th><th>Branch</th><th>Vehicle</th><th>Reg No</th><th>Feedback</th></tr></thead>
          <tbody>
            {items.map(d => (
              <tr key={d.id}>
                <td>{new Date(d.deliveryDate).toLocaleDateString()}</td>
                <td><Link className="text-brand hover:underline" href={`/leads/${d.lead.id}`}>{d.lead.name}</Link></td>
                <td>{d.lead.branch?.name}</td>
                <td>{d.vehicle.brand} {d.vehicle.model}</td>
                <td>{d.registrationNo || '-'}</td>
                <td>{d.customerFeedback || '-'}</td>
              </tr>
            ))}
            {items.length===0 && <tr><td colSpan={6} className="text-center text-gray-500 py-4">No deliveries</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
