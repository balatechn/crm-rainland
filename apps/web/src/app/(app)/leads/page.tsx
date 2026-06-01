'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { LEAD_STATUSES, STATUS_COLORS } from '@/lib/utils';
import { Plus, MessageCircle } from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [branchId, setBranchId] = useState('');

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (branchId) params.set('branchId', branchId);
    const data = await api<any[]>(`/leads?${params}`);
    setLeads(data);
  }
  useEffect(() => { load(); api<any[]>('/branches').then(setBranches); }, []); // eslint-disable-line

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Leads</h1>
        <Link href="/leads/new" className="btn btn-primary"><Plus size={16}/> New Lead</Link>
      </div>

      <div className="card p-3 flex flex-wrap gap-2">
        <input className="input flex-1 min-w-[180px]" placeholder="Search name / mobile / email" value={search} onChange={e=>setSearch(e.target.value)} />
        <select className="select w-48" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="select w-48" value={branchId} onChange={e=>setBranchId(e.target.value)}>
          <option value="">All branches</option>
          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button className="btn btn-outline" onClick={load}>Filter</button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr>
            <th>Name</th><th>Mobile</th><th>Source</th><th>Branch</th>
            <th>Vehicle</th><th>Status</th><th>Assigned</th><th></th>
          </tr></thead>
          <tbody>
            {leads.map(l => (
              <tr key={l.id}>
                <td><Link className="text-brand hover:underline" href={`/leads/${l.id}`}>{l.name}</Link></td>
                <td>
                  <a className="hover:underline" href={`tel:${l.mobile}`}>{l.mobile}</a>
                  <a className="ml-2 text-green-600 inline-flex items-center" target="_blank"
                     href={`https://wa.me/91${l.mobile.replace(/\D/g,'').slice(-10)}`}><MessageCircle size={14}/></a>
                </td>
                <td>{l.source?.name}</td>
                <td>{l.branch?.name}</td>
                <td>{l.vehicle ? `${l.vehicle.brand} ${l.vehicle.model}` : '-'}</td>
                <td><span className={`badge ${STATUS_COLORS[l.status]}`}>{l.status}</span></td>
                <td>{l.assignedTo?.name || '-'}</td>
                <td><Link className="text-sm text-brand hover:underline" href={`/leads/${l.id}`}>Open</Link></td>
              </tr>
            ))}
            {leads.length === 0 && <tr><td colSpan={8} className="text-center text-gray-500 py-6">No leads</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
