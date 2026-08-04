'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Phone, Play, Pause, X, PhoneIncoming, PhoneOutgoing, Clock, User, Calendar } from 'lucide-react';
import { api, apiUrl, getToken } from '@/lib/api';
import { cn } from '@/lib/utils';

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
  notes?: { note: string; time: string }[];
};

type CallsResponse = { count: number; cdr: CallRecord[] };

type DateRange = 'today' | 'yesterday' | 'last7' | 'custom';

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
  // custom
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

// ── Audio Player ─────────────────────────────────────────────────────────────
function AudioPlayer({ file, onClose }: { file: string; onClose: () => void }) {
  const [src,     setSrc]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

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
        setError(e.message || 'Failed to load recording');
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
              <div className="text-xs text-gray-500 truncate max-w-[200px]">{file}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X size={16} />
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center h-16 text-sm text-gray-500">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
            Loading recording…
          </div>
        )}
        {error && <div className="text-sm text-red-500 text-center py-4">{error}</div>}
        {src && (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio ref={audioRef} src={src} controls autoPlay className="w-full mt-2" style={{ borderRadius: 8 }} />
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TelephonePage() {
  const [data,       setData]       = useState<CallsResponse>({ count: 0, cdr: [] });
  const [loading,    setLoading]    = useState(true);
  const [range,      setRange]      = useState<DateRange>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [page,       setPage]       = useState(1);
  const [playFile,   setPlayFile]   = useState<string | null>(null);
  const LIMIT = 20;

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
      setData(res || { count: 0, cdr: [] });
    } catch {
      setData({ count: 0, cdr: [] });
    }
    setLoading(false);
  }, [range, customFrom, customTo, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(data.count / LIMIT);

  const rangeLabel: Record<DateRange, string> = {
    today:     "Today",
    yesterday: "Yesterday",
    last7:     "Last 7 Days",
    custom:    "Custom",
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Phone size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0F172A]">Telephone</h1>
            <p className="text-xs text-[#64748B]">TeleCMI Call Logs</p>
          </div>
        </div>
        <div className="text-sm text-[#64748B]">
          {data.count > 0 && <span>{data.count} call{data.count !== 1 ? 's' : ''} found</span>}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {(['today', 'yesterday', 'last7', 'custom'] as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => { setRange(r); setPage(1); }}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all',
                range === r
                  ? 'bg-[#0F172A] text-white'
                  : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]',
              )}
            >
              {rangeLabel[r]}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setPage(1); }}
              className="text-xs border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-[#374151] focus:outline-none focus:border-blue-400"
            />
            <span className="text-xs text-[#94A3B8]">to</span>
            <input
              type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setPage(1); }}
              className="text-xs border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-[#374151] focus:outline-none focus:border-blue-400"
            />
          </div>
        )}

        <button
          onClick={() => load()}
          className="ml-auto px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
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
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Type</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">From</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">To</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Caller Name</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Agent</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Duration</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Time</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Recording</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {data.cdr.map((call) => {
                  const fromStr = String(call.from || '');
                  const isInbound = call.to && !fromStr.startsWith('91');
                  return (
                    <tr key={call.cmiuid} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-3.5">
                        {isInbound ? (
                          <span className="flex items-center gap-1.5 text-green-600 font-medium text-xs">
                            <PhoneIncoming size={13} /> Inbound
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-blue-600 font-medium text-xs">
                            <PhoneOutgoing size={13} /> Outbound
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-[#374151]">{fmtPhone(call.from)}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-[#374151]">{fmtPhone(call.to)}</td>
                      <td className="px-5 py-3.5 text-xs text-[#374151]">
                        <div className="flex items-center gap-1.5">
                          <User size={11} className="text-[#94A3B8] shrink-0" />
                          {call.name || '—'}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#374151]">{call.agent || '—'}</td>
                      <td className="px-5 py-3.5 text-xs text-[#374151]">
                        <div className="flex items-center gap-1.5">
                          <Clock size={11} className="text-[#94A3B8] shrink-0" />
                          {call.billedsec > 0 ? fmtDuration(call.billedsec) : (
                            <span className="text-red-400 text-[11px]">Missed</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#64748B]">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-[#94A3B8] shrink-0" />
                          {fmtTime(call.time)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {(call.record === true || call.record === 'true') && call.filename ? (
                          <button
                            onClick={() => setPlayFile(call.filename)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors"
                          >
                            <Play size={11} fill="currentColor" /> Play
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#CBD5E1]">No recording</span>
                        )}
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
            <span className="text-xs text-[#64748B]">
              Page {page} of {totalPages} · {data.count} total
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] disabled:opacity-40 hover:bg-[#F8FAFC] transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#E2E8F0] disabled:opacity-40 hover:bg-[#F8FAFC] transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audio player modal */}
      {playFile && <AudioPlayer file={playFile} onClose={() => setPlayFile(null)} />}
    </div>
  );
}
