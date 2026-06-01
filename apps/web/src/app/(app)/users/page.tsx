'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const ROLES = ['ADMIN','CRM_MANAGER','CALL_CENTER','SALES_HEAD','BRANCH_MANAGER','SALES_EXECUTIVE','TEAM_LEADER'];

export default function UsersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ name:'', email:'', password:'', role:'SALES_EXECUTIVE', branchId:'' });

  async function load() { setItems(await api('/users')); }
  useEffect(() => { load(); api<any[]>('/branches').then(setBranches); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await api('/users', { method:'POST', body: JSON.stringify({ ...form, branchId: form.branchId || null }) });
    setForm({ name:'', email:'', password:'', role:'SALES_EXECUTIVE', branchId:'' }); load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      <form onSubmit={add} className="card p-3 grid md:grid-cols-6 gap-2">
        <input className="input" placeholder="Name" required value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
        <input className="input" type="email" placeholder="Email" required value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
        <input className="input" type="password" placeholder="Password" required value={form.password} onChange={e=>setForm({...form, password:e.target.value})}/>
        <select className="select" value={form.role} onChange={e=>setForm({...form, role:e.target.value})}>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="select" value={form.branchId} onChange={e=>setForm({...form, branchId:e.target.value})}>
          <option value="">No branch (HO)</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button className="btn btn-primary">Add</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Branch</th><th>Active</th></tr></thead>
          <tbody>
            {items.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.branch?.name || '-'}</td><td>{u.active?'✓':'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
