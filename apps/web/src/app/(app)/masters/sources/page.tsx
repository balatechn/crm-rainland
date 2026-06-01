'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function SourcesMaster() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');

  async function load() { setItems(await api('/lead-sources')); }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await api('/lead-sources', { method:'POST', body: JSON.stringify({ name }) });
    setName(''); load();
  }
  async function toggle(s: any) {
    await api(`/lead-sources/${s.id}`, { method:'PATCH', body: JSON.stringify({ active: !s.active }) });
    load();
  }
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Lead Sources</h1>
      <form onSubmit={add} className="card p-3 flex gap-2">
        <input className="input flex-1" required placeholder="Source name" value={name} onChange={e=>setName(e.target.value)}/>
        <button className="btn btn-primary">Add</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Name</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {items.map(s => (
              <tr key={s.id}>
                <td>{s.name}</td><td>{s.active ? '✓' : '—'}</td>
                <td><button className="btn btn-outline" onClick={()=>toggle(s)}>{s.active?'Disable':'Enable'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
