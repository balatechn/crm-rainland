'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Store, Plus, X } from 'lucide-react';

const EMPTY = {
  name: '', phone: '', email: '',
  vehicleId: '', branchId: '', testDrive: false,
  notes: '', assignedToId: '',
};

export default function WalkInsPage() {
  const [items,    setItems]    = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [users,    setUsers]    = useState<any[]>([]);
  const [form,     setForm]     = useState({ ...EMPTY });
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  async function load() {
    setItems(await api<any[]>('/walk-ins').catch(() => []));
  }

  useEffect(() => {
    load();
    api<any[]>('/branches').then(setBranches).catch(() => {});
    api<any[]>('/vehicles').then(setVehicles).catch(() => {});
    api<any[]>('/users').then(u => setUsers(u.filter((x: any) => x.active))).catch(() => {});
  }, []);

  function set(k: string, v: any) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.phone.trim() || !form.branchId) {
      setError('Name, Phone and Branch are required.'); return;
    }
    setSaving(true);
    try {
      await api('/walk-ins', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          vehicleId:    form.vehicleId    || null,
          assignedToId: form.assignedToId || null,
        }),
      });
      setForm({ ...EMPTY });
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err?.message || 'Failed to save walk-in.');
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-navy/10 rounded-xl">
            <Store size={22} className="text-navy" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Walk-Ins</h1>
            <p className="text-sm text-gray-500">Register and track showroom walk-in visitors</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setError(''); }}
          className="btn btn-primary flex items-center gap-2"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'New Walk-In'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5">Register Walk-In</h2>
          {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>}
          <form onSubmit={submit} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Full Name <span className="text-red-500">*</span></label>
              <input className="input" placeholder="Customer name" value={form.name}
                onChange={e => set('name', e.target.value)} required />
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Phone <span className="text-red-500">*</span></label>
              <input className="input" placeholder="Mobile number" type="tel" value={form.phone}
                onChange={e => set('phone', e.target.value)} required />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Email</label>
              <input className="input" placeholder="Email address" type="email" value={form.email}
                onChange={e => set('email', e.target.value)} />
            </div>

            {/* Vehicle */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Vehicle Interest</label>
              <select className="select" value={form.vehicleId} onChange={e => set('vehicleId', e.target.value)}>
                <option value="">— Select vehicle —</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.brand} {v.model}{v.variant ? ` (${v.variant})` : ''}</option>
                ))}
              </select>
            </div>

            {/* Branch */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Branch <span className="text-red-500">*</span></label>
              <select className="select" value={form.branchId} onChange={e => set('branchId', e.target.value)} required>
                <option value="">— Select branch —</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Assign to Executive */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Assign to Executive</label>
              <select className="select" value={form.assignedToId} onChange={e => set('assignedToId', e.target.value)}>
                <option value="">— Unassigned —</option>
                {users.filter(u => ['SALES_EXECUTIVE','TEAM_LEADER','BRANCH_MANAGER'].includes(u.role)).map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.branch?.name ?? 'HO'})</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-2">
              <label className="text-xs font-medium text-gray-600">Notes</label>
              <textarea className="input resize-none" rows={2} placeholder="Any remarks or requirements…"
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>

            {/* Test Drive toggle */}
            <div className="flex items-end gap-3 pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => set('testDrive', !form.testDrive)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.testDrive ? 'bg-navy' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.testDrive ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">Test Drive Requested</span>
              </label>
            </div>

            {/* Submit */}
            <div className="md:col-span-2 lg:col-span-3 flex justify-end pt-2">
              <button type="submit" disabled={saving} className="btn btn-primary min-w-[140px]">
                {saving ? 'Saving…' : 'Register Walk-In'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Vehicle</th>
              <th>Branch</th>
              <th>Test Drive</th>
              <th>Assigned To</th>
              <th>Notes</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400">No walk-ins recorded yet.</td></tr>
            )}
            {items.map(w => (
              <tr key={w.id}>
                <td className="font-medium">{w.name}</td>
                <td>{w.phone}</td>
                <td>{w.email || '—'}</td>
                <td>{w.vehicle ? `${w.vehicle.brand} ${w.vehicle.model}` : '—'}</td>
                <td>{w.branch?.name}</td>
                <td>
                  {w.testDrive
                    ? <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">Yes</span>
                    : <span className="text-xs text-gray-400">No</span>}
                </td>
                <td>{w.assignedTo?.name || '—'}</td>
                <td className="max-w-[200px] truncate text-gray-500">{w.notes || '—'}</td>
                <td className="text-gray-500 text-xs whitespace-nowrap">
                  {new Date(w.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
