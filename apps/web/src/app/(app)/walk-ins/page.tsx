'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  Store, Plus, X, User, Phone, Mail, Car, Building2,
  UserCheck, StickyNote, TrendingUp, Calendar, CheckCircle2,
  ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────
interface WalkIn {
  id: string; name: string; phone: string; email?: string;
  vehicle?: { id:string; brand:string; model:string };
  branch: { id:string; name:string };
  assignedTo?: { id:string; name:string; role:string };
  testDrive: boolean; notes?: string; createdAt: string;
}
const EMPTY = {
  name:'', phone:'', email:'', vehicleId:'', branchId:'',
  testDrive:false, notes:'', assignedToId:'', leadSource:'Walk-In',
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg:string; type:'success'|'error'; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="toast animate-slide-up">
      {type === 'success'
        ? <CheckCircle2 size={20} className="text-green-500 shrink-0 mt-0.5" />
        : <AlertCircle  size={20} className="text-red-500   shrink-0 mt-0.5" />}
      <div>
        <div className="font-semibold text-navy text-[13px]">{type === 'success' ? 'Success' : 'Error'}</div>
        <div className="text-[#64748B] text-[12px] mt-0.5">{msg}</div>
      </div>
      <button onClick={onClose} className="ml-auto text-[#94A3B8] hover:text-navy"><X size={15}/></button>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color, sub }:
  { icon:any; label:string; value:number|string; color:string; sub?:string }) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={cn('p-3 rounded-xl shrink-0', color)}>
        <Icon size={20} className="opacity-80" />
      </div>
      <div className="min-w-0">
        <div className="text-[28px] font-bold text-navy leading-none">{value}</div>
        <div className="text-[13px] font-medium text-[#64748B] mt-1">{label}</div>
        {sub && <div className="text-[11px] text-[#94A3B8] mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label }: { value:boolean; onChange:(v:boolean)=>void; label:string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none group">
      <div
        onClick={() => onChange(!value)}
        className={cn('toggle-track', value ? 'bg-brand' : 'bg-[#CBD5E1]')}
      >
        <span className={cn('toggle-thumb', value ? 'translate-x-5' : 'translate-x-0')} />
      </div>
      <span className="text-[13px] font-medium text-[#374151] group-hover:text-navy">{label}</span>
    </label>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, required, icon: Icon, children }: {
  label:string; required?:boolean; icon?:any; children:React.ReactNode;
}) {
  return (
    <div className="input-group">
      <label className="block text-[12px] font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
        {label}{required && <span className="text-[#EF4444] ml-0.5">*</span>}
      </label>
      {Icon ? (
        <div className="relative">
          <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none z-10" />
          <div className="[&>*]:pl-10">{children}</div>
        </div>
      ) : children}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WalkInsPage() {
  const [items,    setItems]    = useState<WalkIn[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [users,    setUsers]    = useState<any[]>([]);
  const [form,     setForm]     = useState({ ...EMPTY });
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState<{msg:string;type:'success'|'error'}|null>(null);
  const [search,   setSearch]   = useState('');
  const [sortKey,  setSortKey]  = useState<string>('createdAt');
  const [sortAsc,  setSortAsc]  = useState(false);
  const [page,     setPage]     = useState(1);
  const PAGE_SIZE = 10;

  const load = useCallback(async () => {
    setItems(await api<WalkIn[]>('/walk-ins').catch(() => []));
  }, []);

  useEffect(() => {
    load();
    api<any[]>('/branches').then(setBranches).catch(()=>{});
    api<any[]>('/vehicles').then(setVehicles).catch(()=>{});
    api<any[]>('/users').then(u => setUsers(u.filter((x:any)=>x.active))).catch(()=>{});
  }, [load]);

  function set(k:string, v:any) { setForm(f => ({...f, [k]:v})); }

  async function submit(e:React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()||!form.phone.trim()||!form.branchId) {
      setToast({msg:'Name, Phone and Branch are required.', type:'error'}); return;
    }
    setSaving(true);
    try {
      await api('/walk-ins', { method:'POST', body:JSON.stringify({
        ...form, vehicleId:form.vehicleId||null, assignedToId:form.assignedToId||null,
      })});
      setForm({...EMPTY}); setShowForm(false); load();
      setToast({msg:'Walk-In registered successfully! You can now create a lead or schedule a test drive.', type:'success'});
    } catch(err:any) {
      setToast({msg:err?.message||'Failed to save. Please try again.', type:'error'});
    } finally { setSaving(false); }
  }

  // KPIs
  const today = new Date().toDateString();
  const kpis = useMemo(() => ({
    total:      items.length,
    todayCount: items.filter(w => new Date(w.createdAt).toDateString() === today).length,
    testDrives: items.filter(w => w.testDrive).length,
    conversion: items.length ? Math.round((items.filter(w=>w.testDrive).length / items.length)*100) : 0,
  }), [items, today]);

  // Filter + sort
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(w =>
      !q ||
      w.name.toLowerCase().includes(q) ||
      w.phone.includes(q) ||
      (w.vehicle && `${w.vehicle.brand} ${w.vehicle.model}`.toLowerCase().includes(q)) ||
      w.branch.name.toLowerCase().includes(q)
    );
  }, [items, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a:any, b:any) => {
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
      if (sortKey === 'vehicle') { av = a.vehicle ? `${a.vehicle.brand} ${a.vehicle.model}` : ''; bv = b.vehicle ? `${b.vehicle.brand} ${b.vehicle.model}` : ''; }
      if (sortKey === 'branch')  { av = a.branch?.name ?? ''; bv = b.branch?.name ?? ''; }
      return (av < bv ? -1 : av > bv ? 1 : 0) * (sortAsc ? 1 : -1);
    });
  }, [filtered, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  function toggleSort(key:string) {
    if (sortKey === key) setSortAsc(v=>!v); else { setSortKey(key); setSortAsc(true); }
    setPage(1);
  }

  const SortIcon = ({ k }:{k:string}) =>
    sortKey===k
      ? (sortAsc ? <ChevronUp size={13} className="inline text-brand ml-0.5"/> : <ChevronDown size={13} className="inline text-brand ml-0.5"/>)
      : <ChevronDown size={13} className="inline text-[#CBD5E1] ml-0.5 opacity-60"/>;

  const execUsers = users.filter(u => ['SALES_EXECUTIVE','TEAM_LEADER','BRANCH_MANAGER'].includes(u.role));

  return (
    <div className="space-y-7 animate-fade-in">

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand/10 rounded-2xl">
            <Store size={24} className="text-brand" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold text-navy tracking-tight leading-none">Walk-In Management</h1>
            <p className="text-[13px] text-[#64748B] mt-1">Register and track showroom visitors and sales opportunities</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(v=>!v); }}
          className={cn('btn shrink-0', showForm ? 'btn-secondary' : 'btn-primary')}
        >
          {showForm ? <><X size={15}/>Cancel</> : <><Plus size={15}/>New Walk-In</>}
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Store}       label="Total Walk-Ins"        value={kpis.total}      color="bg-blue-50 text-blue-600"   sub="All time" />
        <KpiCard icon={Calendar}    label="Today's Walk-Ins"      value={kpis.todayCount} color="bg-indigo-50 text-indigo-600" sub={new Date().toLocaleDateString('en-IN',{weekday:'long'})} />
        <KpiCard icon={Car}         label="Test Drives Requested" value={kpis.testDrives} color="bg-purple-50 text-purple-600" sub="Across all visits" />
        <KpiCard icon={TrendingUp}  label="Conversion Rate"       value={`${kpis.conversion}%`} color="bg-green-50 text-green-600" sub="Walk-in → Test Drive" />
      </div>

      {/* ── Registration Form ── */}
      {showForm && (
        <div className="card p-8 animate-slide-up">
          <div className="mb-7">
            <h2 className="text-[18px] font-semibold text-navy">Register Walk-In</h2>
            <p className="text-[13px] text-[#64748B] mt-0.5">Fill in visitor details to create a new walk-in record</p>
          </div>

          <form onSubmit={submit}>
            {/* Row 1 */}
            <div className="grid md:grid-cols-3 gap-5 mb-5">
              <Field label="Customer Name" required icon={User}>
                <input className="input" placeholder="Full name" value={form.name}
                  onChange={e=>set('name',e.target.value)} required />
              </Field>
              <Field label="Mobile Number" required icon={Phone}>
                <input className="input" placeholder="10-digit mobile" type="tel" value={form.phone}
                  onChange={e=>set('phone',e.target.value)} required />
              </Field>
              <Field label="Email Address" icon={Mail}>
                <input className="input" placeholder="customer@email.com" type="email" value={form.email}
                  onChange={e=>set('email',e.target.value)} />
              </Field>
            </div>

            {/* Row 2 */}
            <div className="grid md:grid-cols-3 gap-5 mb-5">
              <Field label="Vehicle Interest" icon={Car}>
                <select className="select" value={form.vehicleId} onChange={e=>set('vehicleId',e.target.value)}>
                  <option value="">— Select vehicle —</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.brand} {v.model}{v.variant?` (${v.variant})`:''}</option>
                  ))}
                </select>
              </Field>
              <Field label="Branch" required icon={Building2}>
                <select className="select" value={form.branchId} onChange={e=>set('branchId',e.target.value)} required>
                  <option value="">— Select branch —</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </Field>
              <Field label="Assign to Executive" icon={UserCheck}>
                <select className="select" value={form.assignedToId} onChange={e=>set('assignedToId',e.target.value)}>
                  <option value="">— Unassigned —</option>
                  {execUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} — {u.branch?.name??'HO'}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Row 3 */}
            <div className="grid md:grid-cols-3 gap-5 mb-5">
              <div className="flex flex-col gap-1.5">
                <span className="block text-[12px] font-semibold text-[#475569] uppercase tracking-wide">Test Drive</span>
                <div className="flex items-center h-12 px-1">
                  <Toggle value={form.testDrive} onChange={v=>set('testDrive',v)} label="Test Drive Requested" />
                </div>
              </div>
              <Field label="Customer Notes" icon={StickyNote}>
                <div className="[&>textarea]:h-auto">
                  <textarea className="textarea" rows={1} placeholder="Requirements, remarks…"
                    value={form.notes} onChange={e=>set('notes',e.target.value)} style={{height:48}} />
                </div>
              </Field>
            </div>

            {/* Divider + Actions */}
            <div className="divider mb-6" />
            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={()=>setShowForm(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary min-w-[170px]">
                {saving ? (
                  <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</>
                ) : (
                  <><Plus size={15}/>Register Walk-In</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Table card ── */}
      <div className="card overflow-hidden">
        {/* Table header toolbar */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#F1F5F9]">
          <div>
            <h2 className="text-[15px] font-semibold text-navy">Walk-In Records</h2>
            <p className="text-[12px] text-[#94A3B8] mt-0.5">{filtered.length} visitor{filtered.length!==1?'s':''}</p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              className="border border-[#E2E8F0] rounded-xl pl-8 pr-3 text-[13px] bg-[#F8FAFC] text-navy placeholder:text-[#94A3B8] focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
              style={{height:38, width:240}}
              placeholder="Search name, phone, vehicle…"
              value={search}
              onChange={e=>{ setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {[
                  {k:'name',    l:'Customer'},
                  {k:'phone',   l:'Contact'},
                  {k:'vehicle', l:'Vehicle'},
                  {k:'branch',  l:'Branch'},
                  {k:'assignedTo',l:'Executive'},
                  {k:'testDrive', l:'Test Drive'},
                  {k:'createdAt', l:'Date'},
                ].map(({k,l})=>(
                  <th key={k} onClick={()=>toggleSort(k)} className="cursor-pointer hover:bg-[#F1F5F9] transition-colors">
                    {l}<SortIcon k={k}/>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 && (
                <tr><td colSpan={7} className="text-center py-16 text-[#94A3B8]">
                  <Store size={32} className="mx-auto mb-3 opacity-30" />
                  <div className="font-medium">{search ? 'No results match your search' : 'No walk-ins recorded yet'}</div>
                  {!search && <div className="text-[12px] mt-1">Click "New Walk-In" to register the first visitor</div>}
                </td></tr>
              )}
              {paged.map(w => (
                <tr key={w.id} className="group">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[12px] font-bold shrink-0">
                        {w.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-navy text-[13px]">{w.name}</div>
                        {w.email && <div className="text-[11px] text-[#94A3B8]">{w.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="font-medium text-[#374151]">{w.phone}</td>
                  <td>{w.vehicle ? (
                    <span className="badge badge-blue">{w.vehicle.brand} {w.vehicle.model}</span>
                  ) : <span className="text-[#CBD5E1]">—</span>}</td>
                  <td>
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#374151]">
                      <Building2 size={12} className="text-[#94A3B8]" />{w.branch?.name}
                    </span>
                  </td>
                  <td>{w.assignedTo
                    ? <span className="badge badge-gray">{w.assignedTo.name}</span>
                    : <span className="text-[#CBD5E1]">—</span>}
                  </td>
                  <td>
                    {w.testDrive
                      ? <span className="badge badge-green"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Yes</span>
                      : <span className="text-[12px] text-[#CBD5E1]">No</span>}
                  </td>
                  <td className="text-[#94A3B8] text-[12px] whitespace-nowrap">
                    {new Date(w.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#F1F5F9] bg-[#F8FAFC]">
            <span className="text-[12px] text-[#94A3B8]">
              Showing {Math.min((page-1)*PAGE_SIZE+1, sorted.length)}–{Math.min(page*PAGE_SIZE, sorted.length)} of {sorted.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={15}/>
              </button>
              {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1).map((p,i,arr)=>(
                <>
                  {i>0 && arr[i-1]!==p-1 && <span key={`e${p}`} className="text-[#CBD5E1] px-1">…</span>}
                  <button key={p} onClick={()=>setPage(p)}
                    className={cn('h-8 w-8 rounded-lg text-[13px] font-medium transition-colors',
                      page===p ? 'bg-brand text-white' : 'border border-[#E2E8F0] text-[#374151] hover:bg-white')}>
                    {p}
                  </button>
                </>
              ))}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="p-1.5 rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={15}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
