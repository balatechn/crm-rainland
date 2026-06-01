'use client';
import { useEffect, useState } from 'react';
import { api, apiUrl, getToken } from '@/lib/api';
import { LEAD_STATUSES, STATUS_COLORS, inr } from '@/lib/utils';
import { MessageCircle, Phone } from 'lucide-react';

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const [lead, setLead] = useState<any>(null);
  const [activityNote, setActivityNote] = useState('');
  const [activityType, setActivityType] = useState('NOTE');
  const [waBody, setWaBody] = useState('');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  async function load() { setLead(await api(`/leads/${id}`)); }
  useEffect(() => { load(); api<any[]>('/vehicles').then(setVehicles); api<any[]>('/users').then(setUsers); }, []); // eslint-disable-line

  async function setStatus(status: string) {
    await api(`/leads/${id}/status`, { method:'PATCH', body: JSON.stringify({ status }) });
    load();
  }
  async function addActivity() {
    if (!activityNote.trim()) return;
    let payload: any = { type: activityType, note: activityNote };
    if (activityType === 'VISIT' && navigator.geolocation) {
      await new Promise<void>(r => navigator.geolocation.getCurrentPosition(
        p => { payload.gpsLat = p.coords.latitude; payload.gpsLng = p.coords.longitude; r(); },
        () => r(), { timeout: 4000 }
      ));
    }
    await api(`/leads/${id}/activities`, { method:'POST', body: JSON.stringify(payload) });
    setActivityNote(''); load();
  }
  async function sendWa() {
    if (!waBody.trim()) return;
    await api('/whatsapp/send', { method:'POST', body: JSON.stringify({ leadId: id, mobile: lead.mobile, body: waBody }) });
    setWaBody(''); load();
  }
  async function assign(executiveId: string) {
    await api(`/leads/${id}/assign`, { method:'PATCH', body: JSON.stringify({ executiveId }) });
    load();
  }

  if (!lead) return <div>Loading…</div>;

  const wa = `https://wa.me/91${(lead.mobile||'').replace(/\D/g,'').slice(-10)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{lead.name}</h1>
          <div className="text-sm text-gray-500">{lead.branch?.name} · {lead.source?.name}</div>
        </div>
        <div className="flex gap-2">
          <a className="btn btn-outline" href={`tel:${lead.mobile}`}><Phone size={14}/> Call</a>
          <a className="btn btn-outline" target="_blank" href={wa}><MessageCircle size={14}/> WhatsApp</a>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-4 space-y-2">
          <h3 className="font-semibold">Customer</h3>
          <Field k="Mobile" v={lead.mobile}/>
          <Field k="Email" v={lead.email || '-'}/>
          <Field k="City" v={lead.city || '-'}/>
          <Field k="Pincode" v={lead.pincode || '-'}/>
          <Field k="Vehicle" v={lead.vehicle ? `${lead.vehicle.brand} ${lead.vehicle.model}` : '-'}/>
          <Field k="Notes" v={lead.notes || '-'}/>
        </div>

        <div className="card p-4 space-y-3">
          <h3 className="font-semibold">Status</h3>
          <div><span className={`badge ${STATUS_COLORS[lead.status]}`}>{lead.status}</span></div>
          <select className="select" value={lead.status} onChange={e=>setStatus(e.target.value)}>
            {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <h3 className="font-semibold pt-2">Assignment</h3>
          <select className="select" value={lead.assignedTo?.id || ''} onChange={e=>assign(e.target.value)}>
            <option value="">Unassigned</option>
            {users.filter(u=>['SALES_EXECUTIVE','TEAM_LEADER','BRANCH_MANAGER'].includes(u.role)).map(u =>
              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </div>

        <div className="card p-4 space-y-3">
          <h3 className="font-semibold">Quick Actions</h3>
          <QuickQuotation leadId={lead.id} vehicles={vehicles} defaultVehicleId={lead.vehicle?.id} onCreated={load}/>
          <QuickTestDrive leadId={lead.id} users={users} vehicles={vehicles} defaultVehicleId={lead.vehicle?.id} onCreated={load}/>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Add Activity</h3>
          <div className="flex gap-2 mb-2">
            <select className="select w-40" value={activityType} onChange={e=>setActivityType(e.target.value)}>
              <option value="NOTE">Note</option>
              <option value="CALL">Call</option>
              <option value="VISIT">Visit (GPS)</option>
            </select>
            <input className="input" placeholder="Note" value={activityNote} onChange={e=>setActivityNote(e.target.value)}/>
            <button className="btn btn-primary" onClick={addActivity}>Add</button>
          </div>
          <div className="max-h-72 overflow-y-auto space-y-2 mt-2">
            {lead.activities.map((a: any) => (
              <div key={a.id} className="text-sm border-b pb-1">
                <div className="flex justify-between"><b>{a.type}</b><span className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</span></div>
                <div>{a.note}</div>
                <div className="text-xs text-gray-500">by {a.user?.name}{a.gpsLat?` · GPS ${a.gpsLat.toFixed(4)}, ${a.gpsLng.toFixed(4)}`:''}</div>
              </div>
            ))}
            {lead.activities.length===0 && <div className="text-sm text-gray-500">No activities yet</div>}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold mb-2">WhatsApp</h3>
          <div className="flex gap-2 mb-2">
            <input className="input" placeholder="Message" value={waBody} onChange={e=>setWaBody(e.target.value)}/>
            <button className="btn btn-primary" onClick={sendWa}>Send</button>
          </div>
          <div className="max-h-72 overflow-y-auto space-y-2">
            {lead.whatsappLogs.map((m: any) => (
              <div key={m.id} className={`text-sm p-2 rounded ${m.direction==='INBOUND'?'bg-gray-100':'bg-blue-50'}`}>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{m.direction}</span><span>{new Date(m.createdAt).toLocaleString()}</span>
                </div>
                <div>{m.body}</div>
              </div>
            ))}
            {lead.whatsappLogs.length===0 && <div className="text-sm text-gray-500">No messages</div>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <ListCard title="Test Drives" items={lead.testDrives.map((t: any) => `${new Date(t.scheduledAt).toLocaleString()} · ${t.vehicle.model} · ${t.executive?.name}${t.completed?' · ✓':''}`)}/>
        <ListCard title="Quotations" items={lead.quotations.map((q: any) => (
          <a key={q.id} target="_blank" className="text-brand hover:underline" href={apiUrl(`/quotations/${q.id}/pdf`)+`?token=${getToken()}`}>
            {q.number} — {inr(q.total)}
          </a>
        ))}/>
        <ListCard title="Bookings / Deliveries" items={[
          ...lead.bookings.map((b: any) => `${b.number} · ${inr(b.bookingAmount)} on ${new Date(b.bookingDate).toLocaleDateString()}`),
          ...lead.deliveries.map((d: any) => `Delivered ${new Date(d.deliveryDate).toLocaleDateString()} · Reg: ${d.registrationNo || '-'}`),
        ]}/>
      </div>
    </div>
  );
}

function Field({ k, v }: { k:string; v:any }) {
  return <div className="text-sm"><span className="text-gray-500">{k}: </span><span>{v}</span></div>;
}
function ListCard({ title, items }: { title:string; items:any[] }) {
  return (
    <div className="card p-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      {items.length===0 && <div className="text-sm text-gray-500">None</div>}
      <ul className="space-y-1 text-sm">{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
    </div>
  );
}

function QuickQuotation({ leadId, vehicles, defaultVehicleId, onCreated }: any) {
  const [open, setOpen] = useState(false);
  const [vehicleId, setV] = useState(defaultVehicleId || '');
  const [basePrice, setBp] = useState(0);
  const [accessories, setAc] = useState(0);
  const [insurance, setIn] = useState(0);
  const [roadTax, setRt] = useState(0);
  const [discount, setDc] = useState(0);

  useEffect(() => {
    const v = vehicles.find((x: any) => x.id === vehicleId);
    if (v) setBp(v.basePrice);
  }, [vehicleId, vehicles]);

  async function save() {
    await api('/quotations', { method:'POST', body: JSON.stringify({ leadId, vehicleId, basePrice, accessories, insurance, roadTax, discount }) });
    setOpen(false); onCreated();
  }

  if (!open) return <button className="btn btn-outline w-full" onClick={()=>setOpen(true)}>+ Create Quotation</button>;
  return (
    <div className="border rounded p-2 space-y-2">
      <select className="select" value={vehicleId} onChange={e=>setV(e.target.value)}>
        <option value="">Vehicle</option>
        {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.brand} {v.model}</option>)}
      </select>
      {[['Base', basePrice, setBp],['Accessories', accessories, setAc],['Insurance', insurance, setIn],['Road Tax', roadTax, setRt],['Discount', discount, setDc]].map(([l,v,f]: any) => (
        <div key={l} className="flex items-center gap-2"><span className="text-xs w-24">{l}</span><input className="input" type="number" value={v} onChange={e=>f(Number(e.target.value))}/></div>
      ))}
      <div className="flex gap-2"><button className="btn btn-primary flex-1" onClick={save}>Save</button><button className="btn btn-outline" onClick={()=>setOpen(false)}>Cancel</button></div>
    </div>
  );
}

function QuickTestDrive({ leadId, users, vehicles, defaultVehicleId, onCreated }: any) {
  const [open, setOpen] = useState(false);
  const [vehicleId, setV] = useState(defaultVehicleId || '');
  const [executiveId, setE] = useState('');
  const [scheduledAt, setS] = useState('');
  async function save() {
    await api('/test-drives', { method:'POST', body: JSON.stringify({ leadId, vehicleId, executiveId, scheduledAt }) });
    setOpen(false); onCreated();
  }
  if (!open) return <button className="btn btn-outline w-full" onClick={()=>setOpen(true)}>+ Schedule Test Drive</button>;
  return (
    <div className="border rounded p-2 space-y-2">
      <select className="select" value={vehicleId} onChange={e=>setV(e.target.value)}>
        <option value="">Vehicle</option>
        {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.brand} {v.model}</option>)}
      </select>
      <select className="select" value={executiveId} onChange={e=>setE(e.target.value)}>
        <option value="">Executive</option>
        {users.filter((u: any) => ['SALES_EXECUTIVE','TEAM_LEADER'].includes(u.role)).map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <input className="input" type="datetime-local" value={scheduledAt} onChange={e=>setS(e.target.value)} />
      <div className="flex gap-2"><button className="btn btn-primary flex-1" onClick={save}>Save</button><button className="btn btn-outline" onClick={()=>setOpen(false)}>Cancel</button></div>
    </div>
  );
}
