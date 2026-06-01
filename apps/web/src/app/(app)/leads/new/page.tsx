'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function NewLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState<any>({ name:'', mobile:'', alternateMobile:'', email:'', city:'', pincode:'', notes:'', sourceId:'', branchId:'', vehicleId:'' });
  const [sources, setSources] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<any[]>('/lead-sources').then(setSources);
    api<any[]>('/branches').then(setBranches);
    api<any[]>('/vehicles').then(setVehicles);
  }, []);

  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      const created = await api<any>('/leads', { method:'POST', body: JSON.stringify(form) });
      router.push(`/leads/${created.id}`);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">New Lead</h1>
      <form onSubmit={submit} className="card p-4 grid md:grid-cols-2 gap-3">
        <div><label className="text-sm">Name *</label><input className="input mt-1" required value={form.name} onChange={e=>set('name', e.target.value)} /></div>
        <div><label className="text-sm">Mobile *</label><input className="input mt-1" required value={form.mobile} onChange={e=>set('mobile', e.target.value)} /></div>
        <div><label className="text-sm">Alternate Mobile</label><input className="input mt-1" value={form.alternateMobile} onChange={e=>set('alternateMobile', e.target.value)} /></div>
        <div><label className="text-sm">Email</label><input className="input mt-1" type="email" value={form.email} onChange={e=>set('email', e.target.value)} /></div>
        <div><label className="text-sm">City</label><input className="input mt-1" value={form.city} onChange={e=>set('city', e.target.value)} /></div>
        <div><label className="text-sm">Pincode</label><input className="input mt-1" value={form.pincode} onChange={e=>set('pincode', e.target.value)} /></div>
        <div>
          <label className="text-sm">Source *</label>
          <select className="select mt-1" required value={form.sourceId} onChange={e=>set('sourceId', e.target.value)}>
            <option value="">Select</option>
            {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm">Branch (auto if blank)</label>
          <select className="select mt-1" value={form.branchId} onChange={e=>set('branchId', e.target.value)}>
            <option value="">Auto-assign</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm">Vehicle Interested</label>
          <select className="select mt-1" value={form.vehicleId} onChange={e=>set('vehicleId', e.target.value)}>
            <option value="">None</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model}{v.variant?` (${v.variant})`:''}</option>)}
          </select>
        </div>
        <div className="md:col-span-2"><label className="text-sm">Notes</label><textarea className="textarea mt-1" rows={3} value={form.notes} onChange={e=>set('notes', e.target.value)} /></div>
        {err && <div className="md:col-span-2 text-sm text-red-600">{err}</div>}
        <div className="md:col-span-2 flex justify-end gap-2">
          <button type="button" className="btn btn-outline" onClick={() => router.back()}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Create Lead'}</button>
        </div>
      </form>
    </div>
  );
}
