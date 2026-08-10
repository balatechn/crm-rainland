'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Pencil, Check, X } from 'lucide-react';

type Branch = { id: string; name: string; city: string; pincode: string; phone: string; email: string; active: boolean };
type EditFields = { name: string; city: string; pincode: string; phone: string; email: string };

export default function BranchesMaster() {
  const [items,    setItems]    = useState<Branch[]>([]);
  const [form,     setForm]     = useState({ name:'', city:'', pincode:'', address:'', phone:'', email:'' });
  const [editId,   setEditId]   = useState<string|null>(null);
  const [editData, setEditData] = useState<EditFields>({ name:'', city:'', pincode:'', phone:'', email:'' });
  const [saving,   setSaving]   = useState(false);

  async function load() { setItems((await api('/branches')) ?? []); }
  useEffect(() => { load(); }, []);

  async function addBranch(e: React.FormEvent) {
    e.preventDefault();
    await api('/branches', { method:'POST', body: JSON.stringify(form) });
    setForm({ name:'', city:'', pincode:'', address:'', phone:'', email:'' });
    load();
  }

  async function toggle(b: Branch) {
    await api(`/branches/${b.id}`, { method:'PATCH', body: JSON.stringify({ active: !b.active }) });
    load();
  }

  function startEdit(b: Branch) {
    setEditId(b.id);
    setEditData({ name: b.name, city: b.city, pincode: b.pincode||'', phone: b.phone||'', email: b.email||'' });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await api(`/branches/${id}`, { method:'PATCH', body: JSON.stringify(editData) });
    setSaving(false);
    setEditId(null);
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Branches</h1>

      {/* Add form */}
      <form onSubmit={addBranch} className="card p-3 grid md:grid-cols-6 gap-2">
        <input className="input" placeholder="Name"   required value={form.name}    onChange={e=>setForm({...form, name:e.target.value})}/>
        <input className="input" placeholder="City"   required value={form.city}    onChange={e=>setForm({...form, city:e.target.value})}/>
        <input className="input" placeholder="Pincode"         value={form.pincode} onChange={e=>setForm({...form, pincode:e.target.value})}/>
        <input className="input" placeholder="Phone"           value={form.phone}   onChange={e=>setForm({...form, phone:e.target.value})}/>
        <input className="input" type="email" placeholder="Branch Email (for alerts)" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
        <button className="btn btn-primary">Add</button>
      </form>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th><th>City</th><th>Pincode</th><th>Phone</th>
              <th>Alert Email</th><th>Active</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(b => {
              const isEditing = editId === b.id;
              return (
                <tr key={b.id}>
                  {isEditing ? (
                    <>
                      <td><input className="input input-sm" value={editData.name}    onChange={e=>setEditData({...editData, name:e.target.value})}/></td>
                      <td><input className="input input-sm" value={editData.city}    onChange={e=>setEditData({...editData, city:e.target.value})}/></td>
                      <td><input className="input input-sm" value={editData.pincode} onChange={e=>setEditData({...editData, pincode:e.target.value})}/></td>
                      <td><input className="input input-sm" value={editData.phone}   onChange={e=>setEditData({...editData, phone:e.target.value})}/></td>
                      <td><input className="input input-sm" type="email" placeholder="email@branch.com" value={editData.email} onChange={e=>setEditData({...editData, email:e.target.value})}/></td>
                      <td>{b.active ? '✓' : '—'}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button className="btn btn-primary btn-sm" onClick={()=>saveEdit(b.id)} disabled={saving}>
                            <Check size={14}/>
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={()=>setEditId(null)}>
                            <X size={14}/>
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="font-medium">{b.name}</td>
                      <td>{b.city}</td>
                      <td>{b.pincode||'-'}</td>
                      <td>{b.phone||'-'}</td>
                      <td>
                        {b.email
                          ? <span className="text-slate-700 text-sm">{b.email}</span>
                          : <span className="text-amber-500 text-xs font-medium">Not set</span>}
                      </td>
                      <td>{b.active ? '✓' : '—'}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button className="btn btn-outline btn-sm" onClick={()=>startEdit(b)} title="Edit">
                            <Pencil size={13}/>
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={()=>toggle(b)}>
                            {b.active ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
