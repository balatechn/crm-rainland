'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { inr } from '@/lib/utils';

export default function VehiclesMaster() {
  const [items, setItems] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ brand:'MONTRA', model:'', variant:'', basePrice:0, branchIds: [] as string[] });

  async function load() { setItems(await api('/vehicles')); }
  useEffect(() => { load(); api<any[]>('/branches').then(setBranches); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await api('/vehicles', { method:'POST', body: JSON.stringify({ ...form, basePrice: Number(form.basePrice) }) });
    setForm({ brand:'MONTRA', model:'', variant:'', basePrice:0, branchIds: [] }); load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Vehicles</h1>
      <form onSubmit={save} className="card p-3 grid md:grid-cols-6 gap-2">
        <select className="select" value={form.brand} onChange={e=>setForm({...form, brand:e.target.value})}>
          <option value="MONTRA">MONTRA</option><option value="ISUZU">ISUZU</option>
        </select>
        <input className="input" placeholder="Model" required value={form.model} onChange={e=>setForm({...form, model:e.target.value})}/>
        <input className="input" placeholder="Variant (optional)" value={form.variant} onChange={e=>setForm({...form, variant:e.target.value})}/>
        <input className="input" type="number" placeholder="Base Price" value={form.basePrice} onChange={e=>setForm({...form, basePrice:e.target.value})}/>
        <select multiple className="select md:col-span-1" value={form.branchIds} onChange={e=>setForm({...form, branchIds: Array.from(e.target.selectedOptions).map(o=>o.value)})}>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button className="btn btn-primary">Add</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Brand</th><th>Model</th><th>Variant</th><th>Base Price</th><th>Branches</th><th>Active</th></tr></thead>
          <tbody>
            {items.map(v => (
              <tr key={v.id}>
                <td>{v.brand}</td><td>{v.model}</td><td>{v.variant || '-'}</td>
                <td>{inr(v.basePrice)}</td>
                <td className="text-xs">{v.branches.map((b: any) => b.name).join(', ')}</td>
                <td>{v.active ? '✓' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
