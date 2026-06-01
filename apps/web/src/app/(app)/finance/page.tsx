'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

type Finance = {
  id: string;
  bankName?: string;
  loanAmount?: number;
  emi?: number;
  tenure?: number;
  downPayment?: number;
  status: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  lead: { id: string; name: string; mobile: string; branch?: { name: string } };
  booking?: { id: string; number: string };
};

const STATUS_COLORS: Record<string, string> = {
  APPLIED:   'bg-blue-100 text-blue-800',
  APPROVED:  'bg-green-100 text-green-800',
  REJECTED:  'bg-red-100 text-red-800',
  DISBURSED: 'bg-purple-100 text-purple-800',
};
const STATUSES = ['APPLIED', 'APPROVED', 'REJECTED', 'DISBURSED'];

export default function FinancePage() {
  const [items, setItems]     = useState<Finance[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [filter, setFilter]   = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Finance | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, sum] = await Promise.all([
        api<Finance[]>(`/finance${filter ? `?status=${filter}` : ''}`),
        api<any[]>('/finance/summary'),
      ]);
      setItems(Array.isArray(data) ? data : []);
      setSummary(Array.isArray(sum) ? sum : []);
    } catch { setItems([]); setSummary([]); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api(`/finance/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      load();
    } catch { /* ignore */ }
  };

  const fmt = (n?: number) => n != null ? `₹${n.toLocaleString('en-IN')}` : '—';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">Finance Tracking</h1>
        <NewFinanceButton onCreated={load} />
      </div>

      {/* Summary cards */}
      {summary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {STATUSES.map(s => {
            const row = summary.find(r => r.status === s);
            return (
              <div key={s} className="bg-white rounded-xl border p-4 text-center">
                <p className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-1 ${STATUS_COLORS[s]}`}>{s}</p>
                <p className="text-2xl font-bold text-navy">{row?._count?._all ?? 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">{row?._sum?.loanAmount ? fmt(row._sum.loanAmount) : '—'}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {['', ...STATUSES].map(s => (
          <button key={s || 'all'}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === s ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏦</p>
          <p className="text-lg font-medium">No finance applications found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Customer', 'Bank', 'Loan Amt', 'EMI', 'Tenure', 'Down Pmt', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy">{f.lead.name}</p>
                    <p className="text-xs text-gray-500">{f.lead.mobile}</p>
                    {f.lead.branch && <p className="text-xs text-gray-400">{f.lead.branch.name}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{f.bankName ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">{fmt(f.loanAmount)}</td>
                  <td className="px-4 py-3">{fmt(f.emi)}</td>
                  <td className="px-4 py-3">{f.tenure ? `${f.tenure}m` : '—'}</td>
                  <td className="px-4 py-3">{fmt(f.downPayment)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[f.status] ?? ''}`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={f.status}
                      onChange={e => updateStatus(f.id, e.target.value)}
                      className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-navy"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <p className="font-bold mb-4">Edit not implemented yet</p>
            <button onClick={() => setEditing(null)} className="px-4 py-2 bg-navy text-white rounded-lg text-sm">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewFinanceButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen]       = useState(false);
  const [leadId, setLeadId]   = useState('');
  const [bankName, setBankName] = useState('');
  const [loanAmount, setLoan] = useState('');
  const [emi, setEmi]         = useState('');
  const [tenure, setTenure]   = useState('');
  const [downPayment, setDown] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving]   = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId) return;
    setSaving(true);
    try {
      await api('/finance', {
        method: 'POST',
        body: JSON.stringify({
          leadId,
          bankName: bankName || undefined,
          loanAmount: loanAmount ? Number(loanAmount) : undefined,
          emi: emi ? Number(emi) : undefined,
          tenure: tenure ? Number(tenure) : undefined,
          downPayment: downPayment ? Number(downPayment) : undefined,
          remarks: remarks || undefined,
        }),
      });
      setOpen(false); setLeadId(''); setBankName(''); setLoan(''); setEmi(''); setTenure(''); setDown(''); setRemarks('');
      onCreated();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const field = (label: string, value: string, set: (v: string) => void, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-navy focus:outline-none" />
    </div>
  );

  return (
    <>
      <button onClick={() => setOpen(true)} className="px-4 py-2 bg-navy text-white rounded-lg text-sm font-medium hover:bg-navy-light">
        + New Finance Application
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-screen overflow-y-auto space-y-4">
            <h2 className="text-lg font-bold text-navy">New Finance Application</h2>
            {field('Lead ID *', leadId, setLeadId, 'text', 'Paste lead ID')}
            {field('Bank Name', bankName, setBankName, 'text', 'e.g. SBI, HDFC')}
            {field('Loan Amount (₹)', loanAmount, setLoan, 'number', '0')}
            {field('Down Payment (₹)', downPayment, setDown, 'number', '0')}
            {field('EMI / Month (₹)', emi, setEmi, 'number', '0')}
            {field('Tenure (months)', tenure, setTenure, 'number', '24')}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-navy focus:outline-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)}
                className="flex-1 border rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-navy text-white rounded-lg py-2 text-sm font-medium hover:bg-navy-light disabled:opacity-50">
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
