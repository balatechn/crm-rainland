'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Pencil, Check, X } from 'lucide-react';

type Branch = {
  id: string; name: string; city: string; pincode: string;
  phone: string; email: string; whatsapp: string; whatsappGroup: string; active: boolean;
};
type EditFields = {
  name: string; city: string; pincode: string; phone: string;
  email: string; whatsapp: string; whatsappGroup: string;
};

const EMPTY_FORM = { name:'', city:'', pincode:'', address:'', phone:'', email:'', whatsapp:'', whatsappGroup:'' };
const EMPTY_EDIT: EditFields = { name:'', city:'', pincode:'', phone:'', email:'', whatsapp:'', whatsappGroup:'' };

export default function BranchesMaster() {
  const [items,    setItems]    = useState<Branch[]>([]);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [editId,   setEditId]   = useState<string|null>(null);
  const [editData, setEditData] = useState<EditFields>(EMPTY_EDIT);
  const [saving,   setSaving]   = useState(false);

  async function load() { setItems((await api('/branches')) ?? []); }
  useEffect(() => { load(); }, []);

  async function addBranch(e: React.FormEvent) {
    e.preventDefault();
    await api('/branches', { method:'POST', body: JSON.stringify(form) });
    setForm(EMPTY_FORM);
    load();
  }

  async function toggle(b: Branch) {
    await api(`/branches/${b.id}`, { method:'PATCH', body: JSON.stringify({ active: !b.active }) });
    load();
  }

  function startEdit(b: Branch) {
    setEditId(b.id);
    setEditData({
      name: b.name, city: b.city, pincode: b.pincode||'', phone: b.phone||'',
      email: b.email||'', whatsapp: b.whatsapp||'', whatsappGroup: b.whatsappGroup||'',
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await api(`/branches/${id}`, { method:'PATCH', body: JSON.stringify(editData) });
    setSaving(false);
    setEditId(null);
    load();
  }

  const NA = <span className="text-amber-500 text-xs font-medium">Not set</span>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Branches</h1>

      {/* Add form */}
      <form onSubmit={addBranch} className="card p-3 grid md:grid-cols-4 gap-2">
        <input className="input" placeholder="Name"   required value={form.name}    onChange={e=>setForm({...form, name:e.target.value})}/>
        <input className="input" placeholder="City"   required value={form.city}    onChange={e=>setForm({...form, city:e.target.value})}/>
        <input className="input" placeholder="Phone"           value={form.phone}   onChange={e=>setForm({...form, phone:e.target.value})}/>
        <input className="input" type="email" placeholder="Alert Email"             value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
        <input className="input" placeholder="WhatsApp Number (e.g. 919606619561)"  value={form.whatsapp}      onChange={e=>setForm({...form, whatsapp:e.target.value})}/>
        <input className="input" placeholder="WhatsApp Group JID (e.g. 120363…@g.us)" value={form.whatsappGroup} onChange={e=>setForm({...form, whatsappGroup:e.target.value})}/>
        <div className="md:col-span-2 flex justify-end">
          <button className="btn btn-primary">Add Branch</button>
        </div>
      </form>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="table text-sm">
          <thead>
            <tr>
              <th>Name</th><th>City</th><th>Phone</th>
              <th>Alert Email</th><th>WhatsApp</th><th>WA Group</th>
              <th>Active</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map(b => {
              const isEditing = editId === b.id;
              const e = editData;
              const set = (f: Partial<EditFields>) => setEditData({...editData, ...f});
              return (
                <tr key={b.id}>
                  {isEditing ? (
                    <>
                      <td><input className="input input-sm" value={e.name}          onChange={ev=>set({name:ev.target.value})}/></td>
                      <td><input className="input input-sm" value={e.city}          onChange={ev=>set({city:ev.target.value})}/></td>
                      <td><input className="input input-sm" value={e.phone}         onChange={ev=>set({phone:ev.target.value})}/></td>
                      <td><input className="input input-sm" type="email" value={e.email} onChange={ev=>set({email:ev.target.value})} placeholder="email@branch.com"/></td>
                      <td><input className="input input-sm" value={e.whatsapp}      onChange={ev=>set({whatsapp:ev.target.value})} placeholder="919xxxxxxxxx"/></td>
                      <td><input className="input input-sm" value={e.whatsappGroup} onChange={ev=>set({whatsappGroup:ev.target.value})} placeholder="120363…@g.us"/></td>
                      <td>{b.active ? '✓' : '—'}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button className="btn btn-primary btn-sm" onClick={()=>saveEdit(b.id)} disabled={saving}><Check size={14}/></button>
                          <button className="btn btn-outline btn-sm" onClick={()=>setEditId(null)}><X size={14}/></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="font-medium">{b.name}</td>
                      <td>{b.city}</td>
                      <td>{b.phone||'-'}</td>
                      <td>{b.email ? <span className="text-slate-700">{b.email}</span> : NA}</td>
                      <td>{b.whatsapp      ? <span className="text-green-700 font-mono text-xs">{b.whatsapp}</span>      : NA}</td>
                      <td>{b.whatsappGroup ? <span className="text-green-700 font-mono text-xs truncate max-w-[120px] block">{b.whatsappGroup}</span> : NA}</td>
                      <td>{b.active ? '✓' : '—'}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button className="btn btn-outline btn-sm" onClick={()=>startEdit(b)} title="Edit"><Pencil size={13}/></button>
                          <button className="btn btn-outline btn-sm" onClick={()=>toggle(b)}>{b.active?'Disable':'Enable'}</button>
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
