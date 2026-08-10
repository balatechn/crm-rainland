'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function BranchesMaster() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ name:'', city:'', pincode:'', address:'', phone:'', email:'' });

  async function load() { setItems(await api('/branches')); }
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await api('/branches', { method:'POST', body: JSON.stringify(form) });
    setForm({ name:'', city:'', pincode:'', address:'', phone:'', email:'' }); load();
  }
  async function toggle(b: any) {
    await api(`/branches/${b.id}`, { method:'PATCH', body: JSON.stringify({ active: !b.active }) });
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Branches</h1>
      <form onSubmit={save} className="card p-3 grid md:grid-cols-6 gap-2">
        <input className="input" placeholder="Name" required value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
        <input className="input" placeholder="City" required value={form.city} onChange={e=>setForm({...form, city:e.target.value})}/>
        <input className="input" placeholder="Pincode" value={form.pincode} onChange={e=>setForm({...form, pincode:e.target.value})}/>
        <input className="input" placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})}/>
        <input className="input" type="email" placeholder="Branch Email (for alerts)" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
        <button className="btn btn-primary">Add</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Name</th><th>City</th><th>Pincode</th><th>Phone</th><th>Alert Email</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {items.map(b => (
              <tr key={b.id}>
                <td>{b.name}</td><td>{b.city}</td><td>{b.pincode||'-'}</td><td>{b.phone||'-'}</td>
                <td>{b.email||<span className="text-amber-500 text-xs">Not set</span>}</td>
                <td>{b.active ? '✓' : '—'}</td>
                <td><button className="btn btn-outline" onClick={()=>toggle(b)}>{b.active?'Disable':'Enable'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
