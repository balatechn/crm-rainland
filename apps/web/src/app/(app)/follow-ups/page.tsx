'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

type FollowUp = {
  id: string;
  type: string;
  scheduledAt: string;
  completedAt?: string;
  note?: string;
  status: string;
  lead: { id: string; name: string; mobile: string; branch?: { name: string } };
  user: { id: string; name: string };
};

const TYPE_LABELS: Record<string, string> = {
  CALL: '📞 Call', WHATSAPP: '💬 WhatsApp', VISIT: '🏠 Visit', EMAIL: '✉️ Email',
};
const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  DONE:    'bg-green-100 text-green-800',
  MISSED:  'bg-red-100 text-red-800',
};

export default function FollowUpsPage() {
  const [items, setItems]         = useState<FollowUp[]>([]);
  const [filter, setFilter]       = useState<'today' | 'pending' | 'all'>('today');
  const [dateFilter, setDate]     = useState('');
  const [loading, setLoading]     = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/follow-ups';
      if (filter === 'today')   url = '/follow-ups/today';
      else if (filter === 'pending') url = '/follow-ups/pending';
      else if (dateFilter) url = `/follow-ups?date=${dateFilter}`;
      const data = await api<FollowUp[]>(url);
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
    setLoading(false);
  }, [filter, dateFilter]);

  useEffect(() => { load(); }, [load]);

  const markDone = async (id: string) => {
    setCompleting(id);
    try {
      await api(`/follow-ups/${id}/complete`, { method: 'PATCH', body: JSON.stringify({}) });
      load();
    } catch { /* ignore */ }
    setCompleting(null);
  };

  const overdue = (f: FollowUp) => f.status === 'PENDING' && new Date(f.scheduledAt) < new Date();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">Follow-Ups</h1>
        <NewFollowUpButton onCreated={load} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {(['today', 'pending', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setDate(''); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'today' ? "Today's" : f === 'pending' ? 'Overdue' : 'All'}
          </button>
        ))}
        <input
          type="date"
          value={dateFilter}
          onChange={e => { setFilter('all'); setDate(e.target.value); }}
          className="border rounded px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-lg font-medium">No follow-ups found</p>
          <p className="text-sm">Schedule a follow-up from any lead's detail page</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(f => (
            <div
              key={f.id}
              className={`bg-white rounded-xl shadow-sm border p-4 flex items-start gap-4 ${
                overdue(f) ? 'border-red-200 bg-red-50' : 'border-gray-200'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{TYPE_LABELS[f.type] ?? f.type}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[f.status] ?? ''}`}>
                    {f.status}
                  </span>
                  {overdue(f) && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-200 text-red-800">OVERDUE</span>}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <Link href={`/leads/${f.lead.id}`} className="font-semibold text-navy hover:underline">
                    {f.lead.name}
                  </Link>
                  <span>{f.lead.mobile}</span>
                  {f.lead.branch && <span className="text-gray-400">· {f.lead.branch.name}</span>}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Scheduled: {new Date(f.scheduledAt).toLocaleString('en-IN')} · Assigned to: {f.user.name}
                </div>
                {f.note && <p className="mt-1 text-sm text-gray-600 italic">{f.note}</p>}
              </div>
              {f.status === 'PENDING' && (
                <button
                  onClick={() => markDone(f.id)}
                  disabled={completing === f.id}
                  className="shrink-0 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {completing === f.id ? '...' : 'Mark Done'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewFollowUpButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen]     = useState(false);
  const [leadId, setLeadId] = useState('');
  const [type, setType]     = useState('CALL');
  const [dt, setDt]         = useState('');
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId || !dt) return;
    setSaving(true);
    try {
      await api('/follow-ups', { method: 'POST', body: JSON.stringify({ leadId, type, scheduledAt: dt, note }) });
      setOpen(false); setLeadId(''); setDt(''); setNote('');
      onCreated();
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="px-4 py-2 bg-navy text-white rounded-lg text-sm font-medium hover:bg-navy-light">
        + Schedule Follow-Up
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold text-navy">Schedule Follow-Up</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lead ID</label>
              <input required value={leadId} onChange={e => setLeadId(e.target.value)}
                placeholder="Paste lead ID" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-navy focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-navy focus:outline-none">
                <option value="CALL">Call</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="VISIT">Visit</option>
                <option value="EMAIL">Email</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date & Time</label>
              <input required type="datetime-local" value={dt} onChange={e => setDt(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-navy focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-navy focus:outline-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)}
                className="flex-1 border rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-navy text-white rounded-lg py-2 text-sm font-medium hover:bg-navy-light disabled:opacity-50">
                {saving ? 'Saving…' : 'Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
