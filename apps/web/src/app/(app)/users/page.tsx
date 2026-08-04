'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Pencil, Trash2, X, Check, ShieldCheck } from 'lucide-react';

const ROLES = ['ADMIN','CRM_MANAGER','CALL_CENTER','SALES_HEAD','BRANCH_MANAGER','SALES_EXECUTIVE','TEAM_LEADER'];

export default function UsersPage() {
  const [tab,     setTab]     = useState<'active' | 'pending'>('active');
  const [items,   setItems]   = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [form,    setForm]    = useState<any>({ name:'', email:'', password:'', role:'SALES_EXECUTIVE', branchId:'' });
  const [editId,  setEditId]  = useState<string|null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [confirmDel, setConfirmDel] = useState<string|null>(null);

  // Per-row approve form state
  const [approveId,   setApproveId]   = useState<string|null>(null);
  const [approveForm, setApproveForm] = useState({ role: 'SALES_EXECUTIVE', branchId: '' });
  const [approveBusy, setApproveBusy] = useState(false);

  async function load() {
    const [users, pend] = await Promise.all([
      api<any[]>('/users'),
      api<any[]>('/users/pending-sso').catch(() => []),
    ]);
    setItems(users);
    setPending(pend);
  }
  useEffect(() => { load(); api<any[]>('/branches').then(setBranches); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await api('/users', { method:'POST', body: JSON.stringify({ ...form, branchId: form.branchId || null }) });
    setForm({ name:'', email:'', password:'', role:'SALES_EXECUTIVE', branchId:'' });
    load();
  }

  function startEdit(u: any) {
    setEditId(u.id);
    setEditForm({ name: u.name, role: u.role, branchId: u.branchId || '', active: u.active });
  }

  async function saveEdit() {
    await api(`/users/${editId}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...editForm, branchId: editForm.branchId || null }),
    });
    setEditId(null); load();
  }

  async function deactivate(id: string) {
    await api(`/users/${id}`, { method: 'DELETE' });
    setConfirmDel(null); load();
  }

  async function approveSso(id: string) {
    setApproveBusy(true);
    try {
      await api(`/users/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ role: approveForm.role, branchId: approveForm.branchId || null }),
      });
      setApproveId(null);
      setApproveForm({ role: 'SALES_EXECUTIVE', branchId: '' });
      load();
    } finally {
      setApproveBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold text-navy">User Management</h1>
        {pending.length > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-700">
            <ShieldCheck size={13} /> {pending.length} pending approval{pending.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#E2E8F0]">
        {(['active', 'pending'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-brand text-brand'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}>
            {t === 'active' ? 'Active Users' : (
              <span className="flex items-center gap-2">
                Pending Approval
                {pending.length > 0 && (
                  <span className="h-5 w-5 flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold">{pending.length}</span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'active' ? (
        <>
          {/* Add user form */}
          <form onSubmit={add} className="card p-4 grid md:grid-cols-6 gap-2">
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

          {/* Active users table */}
          <div className="card overflow-hidden">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Role</th><th>Branch</th><th>Active</th><th>Login</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(u => editId === u.id ? (
                  <tr key={u.id} className="bg-blue-50/50">
                    <td><input className="input" style={{height:36}} value={editForm.name} onChange={e=>setEditForm({...editForm, name:e.target.value})}/></td>
                    <td className="text-[#94A3B8]">{u.email}</td>
                    <td>
                      <select className="select" style={{height:36}} value={editForm.role} onChange={e=>setEditForm({...editForm, role:e.target.value})}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="select" style={{height:36}} value={editForm.branchId} onChange={e=>setEditForm({...editForm, branchId:e.target.value})}>
                        <option value="">No branch (HO)</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="select" style={{height:36}} value={String(editForm.active)} onChange={e=>setEditForm({...editForm, active: e.target.value === 'true'})}>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </td>
                    <td>—</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button onClick={saveEdit} className="btn btn-primary btn-sm flex items-center gap-1"><Check size={13}/>Save</button>
                        <button onClick={()=>setEditId(null)} className="btn btn-secondary btn-sm"><X size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={u.id} className={!u.active ? 'opacity-50' : ''}>
                    <td className="font-medium text-navy">{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'ADMIN' ? 'badge-navy' : u.role === 'BRANCH_MANAGER' ? 'badge-blue' : 'badge-gray'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.branch?.name || <span className="text-[#CBD5E1]">—</span>}</td>
                    <td>{u.active ? <span className="text-green-600 font-bold">✓</span> : <span className="text-[#CBD5E1]">—</span>}</td>
                    <td>
                      {u.microsoftId
                        ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">Microsoft</span>
                        : <span className="text-[11px] text-[#CBD5E1]">Password</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button onClick={()=>startEdit(u)}
                          className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] hover:text-brand transition-colors" title="Edit">
                          <Pencil size={14}/>
                        </button>
                        {confirmDel === u.id ? (
                          <>
                            <span className="text-[11px] text-red-600 font-medium">Deactivate?</span>
                            <button onClick={()=>deactivate(u.id)} className="btn btn-sm text-[11px] bg-red-500 text-white hover:bg-red-600 border-0 px-2 py-1">Yes</button>
                            <button onClick={()=>setConfirmDel(null)} className="btn btn-secondary btn-sm px-2 py-1 text-[11px]">No</button>
                          </>
                        ) : (
                          <button onClick={()=>setConfirmDel(u.id)}
                            className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors" title="Deactivate">
                            <Trash2 size={14}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Pending Approvals tab */
        <div className="card overflow-hidden">
          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#94A3B8]">
              <ShieldCheck size={32} className="mb-3 opacity-30" />
              <div className="text-sm font-medium">No pending approvals</div>
              <div className="text-xs mt-1">Microsoft SSO sign-up requests will appear here</div>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Requested</th><th>Approve As</th><th>Branch</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(u => (
                  <tr key={u.id}>
                    <td className="font-medium text-navy">{u.name}</td>
                    <td className="flex items-center gap-1.5">
                      {u.email}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">Microsoft</span>
                    </td>
                    <td className="text-xs text-[#64748B]">
                      {new Date(u.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                    </td>
                    <td>
                      {approveId === u.id ? (
                        <select className="select" style={{height:32, fontSize:12}} value={approveForm.role}
                          onChange={e=>setApproveForm(f=>({...f, role: e.target.value}))}>
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs text-[#94A3B8]">—</span>
                      )}
                    </td>
                    <td>
                      {approveId === u.id ? (
                        <select className="select" style={{height:32, fontSize:12}} value={approveForm.branchId}
                          onChange={e=>setApproveForm(f=>({...f, branchId: e.target.value}))}>
                          <option value="">No branch (HO)</option>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs text-[#94A3B8]">—</span>
                      )}
                    </td>
                    <td>
                      {approveId === u.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => approveSso(u.id)}
                            disabled={approveBusy}
                            className="btn btn-primary btn-sm flex items-center gap-1 text-[11px] px-3">
                            <Check size={12}/> {approveBusy ? '…' : 'Approve'}
                          </button>
                          <button onClick={() => setApproveId(null)}
                            className="btn btn-secondary btn-sm px-2"><X size={12}/></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setApproveId(u.id); setApproveForm({ role: 'SALES_EXECUTIVE', branchId: '' }); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                          <ShieldCheck size={12}/> Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
