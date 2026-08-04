'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Phone, Play, X, PhoneIncoming, PhoneOutgoing, Clock,
  Calendar, Search, ExternalLink, UserPlus, ChevronRight, Save,
  PhoneMissed, RefreshCw, Info,
} from 'lucide-react';
import Link from 'next/link';
import { api, apiUrl, getToken } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────
type CallRecord = {
  cmiuid: string;
  duration: number;
  billedsec: number;
  agent: string;
  from: string | number;
  to: string | number;
  time: string | number;
  filename: string;
  record: boolean | string;
  name: string;
};

type TelLog = {
  id: string;
  cmiuid: string;
  callerName: string | null;
  disposition: string | null;
  notes: string | null;
  leadId: string | null;
  lead: { id: string; name: string; mobile: string } | null;
  updatedBy: { id: string; name: string } | null;
};

type CallsResponse = { count: number; cdr: CallRecord[] };
type DateRange = 'today' | 'yesterday' | 'last7' | 'custom';

// ── Dispositions ──────────────────────────────────────────────────────────────
const DISPOSITIONS = [
  { value: 'INTERESTED',     label: 'Interested',      color: 'bg-green-100 text-green-700' },
  { value: 'CALL_BACK',      label: 'Call Back',       color: 'bg-yellow-100 text-yellow-700' },
  { value: 'FOLLOW_UP',      label: 'Follow Up',       color: 'bg-purple-100 text-purple-700' },
  { value: 'CONVERTED',      label: 'Converted',       color: 'bg-blue-100 text-blue-700' },
  { value: 'NOT_INTERESTED', label: 'Not Interested',  color: 'bg-red-100 text-red-700' },
  { value: 'WRONG_NUMBER',   label: 'Wrong Number',    color: 'bg-gray-100 text-gray-600' },
  { value: 'NO_ANSWER',      label: 'No Answer',       color: 'bg-orange-100 text-orange-700' },
];

function dispositionMeta(value: string | null) {
  return DISPOSITIONS.find(d => d.value === value) ?? null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function toUtcTs(date: Date) { return Math.floor(date.getTime() / 1000); }

function dateRangeToBounds(range: DateRange, customFrom: string, customTo: string) {
  const now = new Date();
  if (range === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return { start_date: toUtcTs(start), end_date: toUtcTs(now) };
  }
  if (range === 'yesterday') {
    const start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
    const end   = new Date(start); end.setHours(23, 59, 59, 999);
    return { start_date: toUtcTs(start), end_date: toUtcTs(end) };
  }
  if (range === 'last7') {
    const start = new Date(now); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
    return { start_date: toUtcTs(start), end_date: toUtcTs(now) };
  }
  const start = customFrom ? new Date(customFrom + 'T00:00:00') : new Date(now.setHours(0,0,0,0));
  const end   = customTo   ? new Date(customTo   + 'T23:59:59') : new Date();
  return { start_date: toUtcTs(start), end_date: toUtcTs(end) };
}

function fmtPhone(n: string | number) { return String(n || '—'); }

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function fmtTime(ts: string | number) {
  return new Date(Number(ts)).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function isMissed(call: CallRecord) { return Number(call.billedsec) === 0; }

// ── Audio Player Modal ────────────────────────────────────────────────────────
function AudioPlayer({ file, onClose }: { file: string; onClose: () => void }) {
  const [src,     setSrc]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    let objectUrl: string;
    (async () => {
      try {
        const token = getToken();
        const res = await fetch(apiUrl(`/telephone/recording?file=${encodeURIComponent(file)}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Recording not found');
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch (e: any) {
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Phone size={14} className="text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Call Recording</div>
              <div className="text-xs text-gray-500 truncate max-w-[220px]">{file}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={16} /></button>
        </div>
        {loading && (
          <div className="flex items-center justify-center h-16 text-sm text-gray-500">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
            Loading…
          </div>
        )}
        {error && <div className="text-sm text-red-500 text-center py-4">{error}</div>}
        {src && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio src={src} controls autoPlay className="w-full mt-2" style={{ borderRadius: 8 }} />
        )}
      </div>
    </div>
  );
}

// ── Edit Panel ────────────────────────────────────────────────────────────────
function EditPanel({
  call, log, onClose, onSaved,
}: {
  call: CallRecord;
  log: TelLog | null;
  onClose: () => void;
  onSaved: (updated: TelLog) => void;
}) {
  const [callerName,   setCallerName]   = useState(log?.callerName  ?? call.name ?? '');
  const [disposition,  setDisposition]  = useState(log?.disposition ?? '');
  const [notes,        setNotes]        = useState(log?.notes       ?? '');
  const [linkedLead,   setLinkedLead]   = useState<TelLog['lead']>(log?.lead ?? null);
  const [leadSearch,   setLeadSearch]   = useState('');
  const [leadResults,  setLeadResults]  = useState<any[]>([]);
  const [searching,    setSearching]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saveErr,      setSaveErr]      = useState('');
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fromMobile = String(call.from || '').replace(/\D/g, '').slice(-10);

  async function searchLeads(q: string) {
    if (!q || q.length < 3) { setLeadResults([]); return; }
    setSearching(true);
    try {
      const data = await api<any[]>(`/telephone/leads/search?mobile=${encodeURIComponent(q)}`);
      setLeadResults(Array.isArray(data) ? data : []);
    } catch { setLeadResults([]); }
    setSearching(false);
  }

  function onLeadSearchChange(v: string) {
    setLeadSearch(v);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => searchLeads(v), 400);
  }

  async function save() {
    setSaving(true); setSaveErr('');
    try {
      const updated = await api<TelLog>(`/telephone/logs/${call.cmiuid}`, {
        method: 'PATCH',
        body: JSON.stringify({
          callerName: callerName || null,
          disposition: disposition || null,
          notes: notes || null,
          leadId: linkedLead?.id ?? null,
        }),
      });
      onSaved(updated);
      onClose();
    } catch (e: any) {
      setSaveErr(e.message || 'Save failed');
    }
    setSaving(false);
  }

  const createLeadUrl = `/leads/new?mobile=${fromMobile}&name=${encodeURIComponent(callerName || '')}`;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-y-auto animate-slide-up">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9] sticky top-0 bg-white z-10">
          <div>
            <div className="text-[14px] font-bold text-[#0F172A]">Update Call Log</div>
            <div className="text-[11px] text-[#94A3B8] mt-0.5">{fmtTime(call.time)} · {fmtPhone(call.from)} → {fmtPhone(call.to)}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>

        <div className="flex-1 p-5 space-y-5">

          {/* Caller Name */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Caller Name</label>
            <input
              value={callerName}
              onChange={e => setCallerName(e.target.value)}
              placeholder="Enter caller name…"
              className="w-full border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
            />
          </div>

          {/* Disposition */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Disposition</label>
            <div className="grid grid-cols-2 gap-2">
              {DISPOSITIONS.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDisposition(v => v === d.value ? '' : d.value)}
                  className={cn(
                    'px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all text-left',
                    disposition === d.value
                      ? `${d.color} border-current`
                      : 'bg-white border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]',
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Notes / Remarks</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add call notes…"
              className="w-full border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-sm text-[#0F172A] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 resize-none"
            />
          </div>

          {/* Link to Lead */}
          <div>
            <label className="block text-[11px] font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Link to Lead</label>

            {linkedLead ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div>
                  <div className="text-sm font-semibold text-blue-900">{linkedLead.name}</div>
                  <div className="text-xs text-blue-600">{linkedLead.mobile}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/leads/${linkedLead.id}`} target="_blank"
                    className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600">
                    <ExternalLink size={13} />
                  </Link>
                  <button onClick={() => setLinkedLead(null)}
                    className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-400">
                    <X size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"><Search size={13} /></div>
                <input
                  value={leadSearch}
                  onChange={e => onLeadSearchChange(e.target.value)}
                  placeholder="Search by mobile number…"
                  className="w-full border border-[#E2E8F0] rounded-xl pl-8 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-blue-400 border-t-transparent rounded-full" />
                  </div>
                )}
                {leadResults.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-10 overflow-hidden">
                    {leadResults.map(l => (
                      <button key={l.id}
                        onClick={() => { setLinkedLead(l); setLeadSearch(''); setLeadResults([]); }}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-[#F8FAFC] transition-colors text-left">
                        <div>
                          <div className="text-[13px] font-medium text-[#0F172A]">{l.name}</div>
                          <div className="text-[11px] text-[#64748B]">{l.mobile} · {l.branch?.name}</div>
                        </div>
                        <ChevronRight size={13} className="text-[#CBD5E1]" />
                      </button>
                    ))}
                  </div>
                )}
                {leadSearch.length >= 3 && !searching && leadResults.length === 0 && (
                  <p className="text-xs text-[#94A3B8] mt-1.5 pl-1">No leads found</p>
                )}
              </div>
            )}

            {/* Create Lead shortcut */}
            <Link
              href={createLeadUrl}
              className="mt-2.5 flex items-center gap-2 px-3.5 py-2.5 border border-dashed border-[#CBD5E1] rounded-xl text-[13px] text-[#64748B] hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
            >
              <UserPlus size={14} /> Create new lead from this call
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-[#F1F5F9] p-4 space-y-2">
          {saveErr && <p className="text-xs text-red-500">{saveErr}</p>}
          <button
            onClick={save}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {saving
              ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              : <><Save size={14} /> Save Changes</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TelephonePage() {
  const [data,          setData]          = useState<CallsResponse>({ count: 0, cdr: [] });
  const [logs,          setLogs]          = useState<Record<string, TelLog>>({});
  const [loading,       setLoading]       = useState(true);
  const [range,         setRange]         = useState<DateRange>('today');
  const [customFrom,    setCustomFrom]    = useState('');
  const [customTo,      setCustomTo]      = useState('');
  const [page,          setPage]          = useState(1);
  const [playFile,      setPlayFile]      = useState<string | null>(null);
  const [editCall,      setEditCall]      = useState<CallRecord | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [autoSecs,      setAutoSecs]      = useState(120); // countdown for auto-refresh
  const LIMIT = 20;
  const AUTO_INTERVAL = 120; // seconds

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const bounds = dateRangeToBounds(range, customFrom, customTo);
      const params = new URLSearchParams({
        start_date: String(bounds.start_date),
        end_date:   String(bounds.end_date),
        page:       String(page),
        limit:      String(LIMIT),
      });
      const res = await api<CallsResponse>(`/telephone/calls?${params}`);
      const cdr = res?.cdr ?? [];
      setData({ count: res?.count ?? 0, cdr });

      // Fetch local logs for these calls
      if (cdr.length) {
        const ids = cdr.map((c: CallRecord) => c.cmiuid).join(',');
        const logArr = await api<TelLog[]>(`/telephone/logs?cmiuids=${ids}`);
        const logMap: Record<string, TelLog> = {};
        (logArr || []).forEach((l: TelLog) => { logMap[l.cmiuid] = l; });
        setLogs(logMap);
      } else {
        setLogs({});
      }
    } catch {
      setData({ count: 0, cdr: [] });
    }
    setLoading(false);
    setLastRefreshed(new Date());
    setAutoSecs(AUTO_INTERVAL);
  }, [range, customFrom, customTo, page]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh countdown + trigger (Today tab only)
  useEffect(() => {
    if (range !== 'today') return;
    const tick = setInterval(() => {
      setAutoSecs(s => {
        if (s <= 1) { load(); return AUTO_INTERVAL; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [range, load]);

  function onLogSaved(updated: TelLog) {
    setLogs(prev => ({ ...prev, [updated.cmiuid]: updated }));
  }

  const totalPages = Math.ceil(data.count / LIMIT);

  // Summary counts
  const missed   = data.cdr.filter(isMissed).length;
  const answered = data.cdr.filter(c => !isMissed(c)).length;
  const totalSec = data.cdr.reduce((s, c) => s + Number(c.billedsec), 0);

  return (
    <div className="max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Phone size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Telephone</h1>
            <p className="text-xs text-[#64748B]">TeleCMI Call Logs</p>
          </div>
        </div>

        {/* Summary pills */}
        {!loading && data.count > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1.5 bg-[#F1F5F9] rounded-full text-[#475569] font-medium">{data.count} calls</span>
            <span className="px-3 py-1.5 bg-green-50 rounded-full text-green-700 font-medium">{answered} answered</span>
            {missed > 0 && <span className="px-3 py-1.5 bg-red-50 rounded-full text-red-600 font-medium">{missed} missed</span>}
            {totalSec > 0 && <span className="px-3 py-1.5 bg-blue-50 rounded-full text-blue-700 font-medium">{fmtDuration(totalSec)} total</span>}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 mb-5 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-2">
            {(['today','yesterday','last7','custom'] as DateRange[]).map(r => (
              <button key={r}
                onClick={() => { setRange(r); setPage(1); setAutoSecs(AUTO_INTERVAL); }}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all',
                  range === r ? 'bg-[#0F172A] text-white' : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]',
                )}
              >
                {r === 'today' ? 'Today' : r === 'yesterday' ? 'Yesterday' : r === 'last7' ? 'Last 7 Days' : 'Custom'}
              </button>
            ))}
          </div>
          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setPage(1); }}
                className="text-xs border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400" />
              <span className="text-xs text-[#94A3B8]">to</span>
              <input type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setPage(1); }}
                className="text-xs border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400" />
            </div>
          )}
          <div className="ml-auto flex items-center gap-3">
            {/* Last refreshed + auto-refresh countdown */}
            {lastRefreshed && (
              <span className="text-[11px] text-[#94A3B8] flex items-center gap-1">
                <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Refreshing…' : (
                  range === 'today'
                    ? `Auto-refresh in ${autoSecs}s`
                    : `Refreshed ${lastRefreshed.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}`
                )}
              </span>
            )}
            <button onClick={() => { load(); setAutoSecs(AUTO_INTERVAL); }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
              <RefreshCw size={11} /> Refresh
            </button>
          </div>
        </div>
        {/* CDR delay notice */}
        <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <Info size={12} className="mt-0.5 shrink-0" />
          TeleCMI CDR updates may take <strong className="mx-0.5">5–15 minutes</strong> after a call ends. Recent calls will appear automatically.
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : data.cdr.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-[#94A3B8]">
            <Phone size={28} className="mb-2 opacity-30" />
            <div className="text-sm">No calls found for this period</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC]">
                  {['Type','From','To','Caller Name','Agent','Duration','Time','Disposition','Recording',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {data.cdr.map(call => {
                  const fromStr  = String(call.from || '');
                  const isInbound = call.to && !fromStr.startsWith('91');
                  const missed    = isMissed(call);
                  const log       = logs[call.cmiuid] ?? null;
                  const disp      = dispositionMeta(log?.disposition ?? null);
                  const displayName = log?.callerName || call.name || '—';

                  return (
                    <tr key={call.cmiuid}
                      className={cn('transition-colors hover:bg-[#F8FAFC]', missed && 'bg-red-50/40 hover:bg-red-50/70')}>

                      {/* Type */}
                      <td className="px-4 py-3.5">
                        {missed ? (
                          <span className="flex items-center gap-1.5 text-red-500 font-medium text-xs">
                            <PhoneMissed size={13} /> Missed
                          </span>
                        ) : isInbound ? (
                          <span className="flex items-center gap-1.5 text-green-600 font-medium text-xs">
                            <PhoneIncoming size={13} /> Inbound
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-blue-600 font-medium text-xs">
                            <PhoneOutgoing size={13} /> Outbound
                          </span>
                        )}
                      </td>

                      {/* From / To */}
                      <td className="px-4 py-3.5 font-mono text-xs text-[#374151]">{fmtPhone(call.from)}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-[#374151]">{fmtPhone(call.to)}</td>

                      {/* Caller Name */}
                      <td className="px-4 py-3.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('font-medium', log?.callerName ? 'text-[#0F172A]' : 'text-[#94A3B8]')}>
                            {displayName}
                          </span>
                          {log?.lead && (
                            <Link href={`/leads/${log.lead.id}`}
                              className="shrink-0 text-blue-500 hover:text-blue-700" title={log.lead.name}>
                              <ExternalLink size={11} />
                            </Link>
                          )}
                        </div>
                      </td>

                      {/* Agent */}
                      <td className="px-4 py-3.5 text-xs text-[#374151]">{call.agent || '—'}</td>

                      {/* Duration */}
                      <td className="px-4 py-3.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock size={11} className="text-[#94A3B8] shrink-0" />
                          {missed
                            ? <span className="text-red-400">Missed</span>
                            : fmtDuration(Number(call.billedsec))}
                        </div>
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3.5 text-xs text-[#64748B] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-[#94A3B8] shrink-0" />
                          {fmtTime(call.time)}
                        </div>
                      </td>

                      {/* Disposition */}
                      <td className="px-4 py-3.5">
                        {disp
                          ? <span className={cn('px-2.5 py-1 rounded-full text-[11px] font-semibold', disp.color)}>{disp.label}</span>
                          : <span className="text-[11px] text-[#CBD5E1]">—</span>
                        }
                      </td>

                      {/* Recording */}
                      <td className="px-4 py-3.5">
                        {(call.record === true || call.record === 'true') && call.filename ? (
                          <button onClick={() => setPlayFile(call.filename)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors">
                            <Play size={11} fill="currentColor" /> Play
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#CBD5E1]">—</span>
                        )}
                      </td>

                      {/* Update */}
                      <td className="px-4 py-3.5">
                        <button onClick={() => setEditCall(call)}
                          className="px-3 py-1.5 text-xs font-semibold text-[#475569] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg transition-colors whitespace-nowrap">
                          Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-[#F1F5F9] flex items-center justify-between">
            <span className="text-xs text-[#64748B]">Page {page} of {totalPages} · {data.count} total</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] disabled:opacity-40 hover:bg-[#F8FAFC]">Previous</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] disabled:opacity-40 hover:bg-[#F8FAFC]">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {playFile && <AudioPlayer file={playFile} onClose={() => setPlayFile(null)} />}
      {editCall && (
        <EditPanel
          call={editCall}
          log={logs[editCall.cmiuid] ?? null}
          onClose={() => setEditCall(null)}
          onSaved={onLogSaved}
        />
      )}
    </div>
  );
}
