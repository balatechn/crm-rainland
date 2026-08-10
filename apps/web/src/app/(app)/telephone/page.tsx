'use client';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Phone, Play, Pause, X, PhoneIncoming, PhoneOutgoing, Clock,
  Calendar, Search, ExternalLink, UserPlus, Save, Filter,
  PhoneMissed, RefreshCw, Info, Download, ChevronDown,
  FileDown, Pencil, ChevronLeft, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { api, apiUrl, getToken } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────
type CallRecord = {
  cmiuid: string; duration: number; billedsec: number; agent: string;
  from: string | number; to: string | number; time: string | number;
  filename: string; record: boolean | string; name: string;
  _direction?: 'inbound' | 'outbound';
  _answered?: boolean;
};
type TelLog = {
  id: string; cmiuid: string; callerName: string | null;
  disposition: string | null; notes: string | null; leadId: string | null;
  sourceId: string | null;
  testDriveRequested: boolean;
  lead: { id: string; name: string; mobile: string } | null;
  source: { id: string; name: string } | null;
  updatedBy: { id: string; name: string } | null;
};
type CallsResponse = { count: number; cdr: CallRecord[] };
type DateRange = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';
type FilterType = 'ALL' | 'INBOUND' | 'OUTBOUND' | 'MISSED';

// ── Constants ─────────────────────────────────────────────────────────────────
const DISPOSITIONS = [
  { value: 'INTERESTED',     label: 'Interested',      bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { value: 'CALL_BACK',      label: 'Call Back',       bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500' },
  { value: 'FOLLOW_UP',      label: 'Follow Up',       bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-500' },
  { value: 'CONVERTED',      label: 'Converted',       bg: 'bg-purple-50',  text: 'text-purple-700', dot: 'bg-purple-500' },
  { value: 'NOT_INTERESTED', label: 'Not Interested',  bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500' },
  { value: 'WRONG_NUMBER',   label: 'Wrong Number',    bg: 'bg-slate-100',  text: 'text-slate-600',  dot: 'bg-slate-400' },
  { value: 'NO_ANSWER',      label: 'No Answer',       bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500' },
];
const PAGE_SIZE = 15;
const AUTO_SECS = 120;

// ── Helpers ───────────────────────────────────────────────────────────────────
const toUtcTs = (d: Date) => Math.floor(d.getTime() / 1000);

function dateRange(range: DateRange, from: string, to: string) {
  const now = new Date();
  if (range === 'today') {
    const s = new Date(now); s.setHours(0,0,0,0);
    return { start_date: toUtcTs(s), end_date: toUtcTs(now) };
  }
  if (range === 'yesterday') {
    const s = new Date(now); s.setDate(s.getDate()-1); s.setHours(0,0,0,0);
    const e = new Date(s); e.setHours(23,59,59,999);
    return { start_date: toUtcTs(s), end_date: toUtcTs(e) };
  }
  if (range === 'last7') {
    const s = new Date(now); s.setDate(s.getDate()-6); s.setHours(0,0,0,0);
    return { start_date: toUtcTs(s), end_date: toUtcTs(now) };
  }
  if (range === 'last30') {
    const s = new Date(now); s.setDate(s.getDate()-29); s.setHours(0,0,0,0);
    return { start_date: toUtcTs(s), end_date: toUtcTs(now) };
  }
  const s = from ? new Date(from+'T00:00:00') : new Date(now.setHours(0,0,0,0));
  const e = to   ? new Date(to+'T23:59:59')   : new Date();
  return { start_date: toUtcTs(s), end_date: toUtcTs(e) };
}

const isMissed  = (c: CallRecord) => c._answered === false;
const isInbound = (c: CallRecord) => c._direction === 'inbound';

const hasRecord  = (c: CallRecord) => (c.record === true || c.record === 'true') && c.filename;

// For inbound: customer called from `from`. For outbound: agent called `to` (customer).
const customerPhone = (c: CallRecord) => isInbound(c) ? c.from : c.to;

function fmtPhone(n: string|number) { return String(n||'—'); }
function fmtDur(sec: number) {
  if (!sec) return '—';
  const m = Math.floor(sec/60), s = sec%60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
function fmtTime(ts: string|number) {
  return new Date(Number(ts)).toLocaleString('en-IN',{ day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}
function initials(name: string, phone: string) {
  if (name && name !== 'unknown') return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return String(phone||'?').replace(/\D/g,'').slice(-2);
}
function dispMeta(v: string|null) { return DISPOSITIONS.find(d=>d.value===v) ?? null; }

function exportCsv(calls: CallRecord[], logs: Record<string,TelLog>) {
  const H = ['Type','Customer Number','Caller Name','Agent','Duration (s)','Date & Time','Disposition','Notes','Linked Lead'];
  const rows = calls.map(c => {
    const l = logs[c.cmiuid];
    const dir = isInbound(c) ? 'Inbound' : 'Outbound';
    const type = isMissed(c) ? `${dir} (No Answer)` : dir;
    return [type, fmtPhone(customerPhone(c)), l?.callerName||c.name||'',
      c.agent||'', c.billedsec, fmtTime(c.time), l?.disposition||'', l?.notes||'', l?.lead?.name||''];
  });
  const csv = [H,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = Object.assign(document.createElement('a'),{
    href: URL.createObjectURL(new Blob([csv],{type:'text/csv'})),
    download: `calls_${new Date().toISOString().slice(0,10)}.csv`,
  });
  a.click(); URL.revokeObjectURL(a.href);
}

// ── Waveform ──────────────────────────────────────────────────────────────────
function Waveform({ progress, onSeek }: { progress: number; onSeek:(p:number)=>void }) {
  const bars = useMemo(() => Array.from({length:60},(_,i)=>
    0.25 + Math.abs(Math.sin(i*0.4)*0.35 + Math.sin(i*0.13)*0.25 + (i%7===0?0.1:0))
  ),[]);
  return (
    <div className="flex items-center gap-[2px] h-14 cursor-pointer select-none"
      onClick={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        onSeek((e.clientX - rect.left) / rect.width);
      }}>
      {bars.map((h,i) => {
        const filled = i/bars.length <= progress;
        return (
          <div key={i} className={cn('flex-1 rounded-full transition-colors duration-75',
            filled ? 'bg-[#E11D48]' : 'bg-slate-200')}
            style={{height:`${Math.round(h*100)}%`}} />
        );
      })}
    </div>
  );
}

// ── Audio Player Modal ────────────────────────────────────────────────────────
function AudioModal({ call, callerName, onClose }: {
  call: CallRecord; callerName: string; onClose: ()=>void;
}) {
  const [src,      setSrc]      = useState<string|null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [current,  setCurrent]  = useState(0);
  const [speed,    setSpeed]    = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let url = '';
    (async () => {
      try {
        const token = getToken();
        const res = await fetch(apiUrl(`/telephone/recording?file=${encodeURIComponent(call.filename)}`),{
          headers: token ? {Authorization:`Bearer ${token}`} : {},
        });
        if (!res.ok) throw new Error('Recording not available');
        url = URL.createObjectURL(await res.blob());
        setSrc(url);
      } catch(e:any) { setError(e.message||'Failed'); }
      setLoading(false);
    })();
    return () => { if(url) URL.revokeObjectURL(url); };
  }, [call.filename]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => { setCurrent(a.currentTime); setProgress(a.duration ? a.currentTime/a.duration : 0); };
    const onMeta = () => setDuration(a.duration);
    const onEnd  = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    return () => { a.removeEventListener('timeupdate',onTime); a.removeEventListener('loadedmetadata',onMeta); a.removeEventListener('ended',onEnd); };
  }, [src]);

  useEffect(() => { if(audioRef.current) audioRef.current.playbackRate = speed; }, [speed]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); } else { a.play(); setPlaying(true); }
  }

  function seek(p: number) {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    a.currentTime = p * a.duration;
  }

  function download() {
    if (!src) return;
    Object.assign(document.createElement('a'),{href:src, download:call.filename}).click();
  }

  const fmtSec = (s:number) => `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  const callType = isMissed(call) ? 'Missed' : isInbound(call) ? 'Inbound' : 'Outbound';
  const typeColor = isMissed(call) ? 'text-red-500' : isInbound(call) ? 'text-emerald-600' : 'text-blue-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                {initials(callerName, fmtPhone(customerPhone(call)))}
              </div>
              <div>
                <div className="text-white font-semibold text-sm">{callerName || fmtPhone(customerPhone(call))}</div>
                <div className={cn('text-xs font-medium', typeColor)}>{callType} · {fmtTime(call.time)}</div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"><X size={16}/></button>
          </div>
          {/* Waveform */}
          {loading ? (
            <div className="flex items-center justify-center h-14 text-white/50 text-xs gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full"/>Loading recording…
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-14 text-red-300 text-xs">{error}</div>
          ) : (
            <Waveform progress={progress} onSeek={seek}/>
          )}
        </div>

        {/* Controls */}
        <div className="px-6 py-4">
          {/* Time */}
          <div className="flex justify-between text-xs text-slate-400 mb-3 font-mono">
            <span>{fmtSec(current)}</span>
            <span>{duration ? fmtSec(duration) : '—'}</span>
          </div>
          {/* Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Speed */}
              {[1,1.5,2].map(s => (
                <button key={s} onClick={() => setSpeed(s)}
                  className={cn('px-2.5 py-1 rounded-lg text-xs font-bold border transition-all',
                    speed===s ? 'bg-[#0F172A] text-white border-[#0F172A]' : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
                  {s}x
                </button>
              ))}
            </div>
            {/* Play/Pause */}
            <button onClick={toggle} disabled={!src}
              className="h-12 w-12 rounded-full bg-[#E11D48] hover:bg-[#BE123C] text-white flex items-center justify-center shadow-lg transition-all disabled:opacity-40">
              {playing ? <Pause size={18} fill="white"/> : <Play size={18} fill="white" className="ml-0.5"/>}
            </button>
            {/* Download */}
            <button onClick={download} disabled={!src}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-40">
              <Download size={13}/> Download
            </button>
          </div>
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        {src && <audio ref={audioRef} src={src} style={{display:'none'}}/>}
      </div>
    </div>
  );
}

// ── Edit Panel ────────────────────────────────────────────────────────────────
function EditPanel({ call, log, onClose, onSaved }:{
  call: CallRecord; log: TelLog|null; onClose:()=>void; onSaved:(u:TelLog)=>void;
}) {
  const [callerName,         setCallerName]         = useState(log?.callerName  ?? call.name ?? '');
  const [disposition,        setDisposition]        = useState(log?.disposition ?? '');
  const [notes,              setNotes]              = useState(log?.notes       ?? '');
  const [testDriveRequested, setTestDriveRequested] = useState(log?.testDriveRequested ?? false);
  const [sourceId,           setSourceId]           = useState(log?.sourceId ?? '');
  const [sources,            setSources]            = useState<{id:string;name:string}[]>([]);
  const [testDriveBranchId,  setTestDriveBranchId]  = useState('');
  const [branches,           setBranches]           = useState<{id:string;name:string;city:string}[]>([]);
  const [linkedLead,         setLinkedLead]         = useState<TelLog['lead']>(log?.lead ?? null);
  const [followUp,           setFollowUp]           = useState('');
  const [leadSearch,         setLeadSearch]         = useState('');
  const [leadResults,        setLeadResults]        = useState<any[]>([]);
  const [searching,          setSearching]          = useState(false);
  const [saving,             setSaving]             = useState(false);
  const [saveErr,            setSaveErr]            = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(() => {
    api<{id:string;name:string;active:boolean}[]>('/lead-sources')
      .then(d => setSources((d||[]).filter(s=>s.active)))
      .catch(()=>{});
    api<{id:string;name:string;city:string;active:boolean}[]>('/branches')
      .then(d => setBranches((d||[]).filter(b=>b.active)))
      .catch(()=>{});
  }, []);

  const callType = isMissed(call) ? 'Missed' : isInbound(call) ? 'Inbound' : 'Outbound';
  const callColor = isMissed(call) ? '#EF4444' : isInbound(call) ? '#16A34A' : '#2563EB';
  const custPhone = customerPhone(call);
  const displayName = callerName || call.name || fmtPhone(custPhone);
  const fromMobile = String(custPhone||'').replace(/\D/g,'').slice(-10);

  async function searchLeads(q: string) {
    if (!q || q.length < 3) { setLeadResults([]); return; }
    setSearching(true);
    try {
      const d = await api<any[]>(`/telephone/leads/search?mobile=${encodeURIComponent(q)}`);
      setLeadResults(Array.isArray(d) ? d : []);
    } catch { setLeadResults([]); }
    setSearching(false);
  }

  async function save() {
    setSaving(true); setSaveErr('');
    try {
      const updated = await api<TelLog>(`/telephone/logs/${call.cmiuid}`,{
        method:'PATCH',
        body: JSON.stringify({
          callerName: callerName||null, disposition: disposition||null,
          notes: notes||null, leadId: linkedLead?.id??null,
          sourceId: sourceId||null,
          testDriveRequested,
          testDriveBranchId: testDriveRequested ? (testDriveBranchId||null) : null,
          callerPhone: fmtPhone(customerPhone(call)),
        }),
      });
      onSaved(updated); onClose();
    } catch(e:any) { setSaveErr(e.message||'Save failed'); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">

        {/* Customer card */}
        <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] px-5 pt-5 pb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Update Call Log</span>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition-colors"><X size={15}/></button>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
              style={{background: callColor+'33', border:`2px solid ${callColor}66`}}>
              {initials(displayName, fmtPhone(custPhone))}
            </div>
            <div>
              <div className="text-white font-bold text-base leading-tight">{displayName}</div>
              <div className="text-white/60 text-xs mt-0.5">{fmtPhone(custPhone)}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label:'Type',     value: callType },
              { label:'Duration', value: fmtDur(Number(call.billedsec)) },
              { label:'Time',     value: fmtTime(call.time) },
            ].map(({label,value}) => (
              <div key={label} className="bg-white/8 rounded-xl px-3 py-2">
                <div className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{label}</div>
                <div className="text-white text-xs font-semibold mt-0.5 truncate">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Caller Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Caller Name</label>
            <input value={callerName} onChange={e=>setCallerName(e.target.value)}
              placeholder="Enter caller name…"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-red-50 transition-all"/>
          </div>

          {/* Source of the number */}
          {sources.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Source of the Number</label>
              <select value={sourceId} onChange={e=>setSourceId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-red-50 transition-all bg-white">
                <option value="">— Select source —</option>
                {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {/* Disposition */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Disposition</label>
            <div className="grid grid-cols-2 gap-2">
              {DISPOSITIONS.map(d => (
                <button key={d.value} onClick={() => setDisposition(v=>v===d.value?'':d.value)}
                  className={cn('px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all text-left flex items-center gap-2',
                    disposition===d.value ? `${d.bg} ${d.text} border-current` : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}>
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', d.dot)}/>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Test Drive Toggle */}
          <div className={cn('rounded-xl border-2 transition-all overflow-hidden',
            testDriveRequested ? 'border-emerald-500' : 'border-slate-200')}>
            <button type="button"
              onClick={() => setTestDriveRequested(v => !v)}
              className={cn('w-full flex items-center gap-3 px-4 py-3.5 transition-all text-left',
                testDriveRequested ? 'bg-emerald-50' : 'bg-white hover:bg-slate-50')}>
              <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0 text-xl',
                testDriveRequested ? 'bg-emerald-100' : 'bg-slate-100')}>
                🚗
              </div>
              <div className="flex-1">
                <div className={cn('text-sm font-semibold', testDriveRequested ? 'text-emerald-700' : 'text-slate-700')}>
                  Test Drive Requested
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {testDriveRequested ? 'Select branch below — they will be notified by email' : 'Tap to mark customer as wanting a test drive'}
                </div>
              </div>
              <div className={cn('h-5 w-9 rounded-full transition-colors relative shrink-0',
                testDriveRequested ? 'bg-emerald-500' : 'bg-slate-200')}>
                <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                  testDriveRequested ? 'translate-x-4' : 'translate-x-0.5')}/>
              </div>
            </button>

            {/* Branch picker — visible only when test drive is on */}
            {testDriveRequested && (
              <div className="px-4 pb-4 pt-1 bg-emerald-50 border-t border-emerald-100">
                <label className="block text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-2">
                  Which branch? *
                </label>
                <select value={testDriveBranchId} onChange={e=>setTestDriveBranchId(e.target.value)}
                  className="w-full border border-emerald-200 bg-white rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all">
                  <option value="">— Select branch for test drive —</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}{b.city ? ` · ${b.city}` : ''}</option>
                  ))}
                </select>
                {testDriveBranchId === '' && (
                  <p className="text-[11px] text-amber-600 mt-1.5">Please select a branch so they can be notified</p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Notes</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3}
              placeholder="Add call notes, outcomes…"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-red-50 resize-none transition-all"/>
          </div>

          {/* Follow-up date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Schedule Follow-up</label>
            <input type="datetime-local" value={followUp} onChange={e=>setFollowUp(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-red-50 transition-all"/>
          </div>

          {/* Link Lead */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Linked Lead</label>
            {linkedLead ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div>
                  <div className="text-sm font-semibold text-blue-900">{linkedLead.name}</div>
                  <div className="text-xs text-blue-600">{linkedLead.mobile}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link href={`/leads/${linkedLead.id}`} target="_blank" className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600"><ExternalLink size={13}/></Link>
                  <button onClick={()=>setLinkedLead(null)} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-400"><X size={13}/></button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={leadSearch}
                  onChange={e=>{ setLeadSearch(e.target.value); if(timer.current) clearTimeout(timer.current); timer.current=setTimeout(()=>searchLeads(e.target.value),400); }}
                  placeholder="Search by mobile…"
                  className="w-full border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-red-50 transition-all"/>
                {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="animate-spin h-3.5 w-3.5 border-2 border-red-400 border-t-transparent rounded-full"/></div>}
                {leadResults.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                    {leadResults.map(l=>(
                      <button key={l.id} onClick={()=>{setLinkedLead(l);setLeadSearch('');setLeadResults([]);}}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50 transition-colors text-left">
                        <div>
                          <div className="text-[13px] font-semibold text-slate-800">{l.name}</div>
                          <div className="text-[11px] text-slate-500">{l.mobile}{l.branch ? ` · ${l.branch.name}` : ''}</div>
                        </div>
                        <ChevronRight size={13} className="text-slate-300"/>
                      </button>
                    ))}
                  </div>
                )}
                {leadSearch.length>=3 && !searching && leadResults.length===0 && (
                  <p className="text-xs text-slate-400 mt-1.5 pl-1">No leads found</p>
                )}
              </div>
            )}
            <Link href={`/leads/new?mobile=${fromMobile}&name=${encodeURIComponent(callerName||'')}`}
              className="mt-2.5 flex items-center gap-2 px-3.5 py-2.5 border border-dashed border-slate-300 rounded-xl text-[13px] text-slate-500 hover:border-[#E11D48] hover:text-[#E11D48] hover:bg-red-50 transition-all">
              <UserPlus size={13}/> Create new lead from this call
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 space-y-2 bg-white">
          {saveErr && <p className="text-xs text-red-500">{saveErr}</p>}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={save} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#E11D48] hover:bg-[#BE123C] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
              {saving ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/> : <><Save size={14}/> Save</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color, bg }:{
  label:string; value:string|number; sub?:string; icon:React.ReactNode; color:string; bg:string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 px-5 py-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0', bg)}>
        <span className={color}>{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
        <div className="text-xl font-bold text-slate-900 mt-0.5 leading-none">{value}</div>
        {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TelephonePage() {
  const [data,       setData]       = useState<CallsResponse>({count:0,cdr:[]});
  const [logs,       setLogs]       = useState<Record<string,TelLog>>({});
  const [loading,    setLoading]    = useState(true);
  const [apiDebug,   setApiDebug]   = useState('');
  const [range,      setRange]      = useState<DateRange>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [page,       setPage]       = useState(1);
  const [playCall,   setPlayCall]   = useState<CallRecord|null>(null);
  const [editCall,   setEditCall]   = useState<CallRecord|null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date|null>(null);
  const [autoSecs,   setAutoSecs]   = useState(AUTO_SECS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Filters
  const [filterType,       setFilterType]       = useState<FilterType>('ALL');
  const [filterAgent,      setFilterAgent]       = useState('');
  const [filterDisp,       setFilterDisp]        = useState('');
  const [filterSearch,     setFilterSearch]      = useState('');
  const [clientPage,       setClientPage]        = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setApiDebug('');
    try {
      const bounds = dateRange(range, customFrom, customTo);
      const q = new URLSearchParams({ start_date:String(bounds.start_date), end_date:String(bounds.end_date), page:String(page), limit:'20' });
      const res = await api<CallsResponse & { _debug?: string }>(`/telephone/calls?${q}`);
      if (res?._debug) setApiDebug(res._debug);
      const cdr = res?.cdr ?? [];
      setData({ count: res?.count ?? 0, cdr });
      if (cdr.length) {
        const ids = cdr.map((c:CallRecord)=>c.cmiuid).join(',');
        const arr  = await api<TelLog[]>(`/telephone/logs?cmiuids=${ids}`);
        const map: Record<string,TelLog> = {};
        (arr||[]).forEach((l:TelLog)=>{ map[l.cmiuid]=l; });
        setLogs(map);
      } else { setLogs({}); }
    } catch(e:any) {
      setData({count:0,cdr:[]});
      setApiDebug(e?.message || 'Network error');
    }
    setLoading(false);
    setLastRefresh(new Date());
    setAutoSecs(AUTO_SECS);
  }, [range, customFrom, customTo, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (range !== 'today') return;
    const iv = setInterval(() => setAutoSecs(s => { if(s<=1){load();return AUTO_SECS;} return s-1; }), 1000);
    return () => clearInterval(iv);
  }, [range, load]);

  function onLogSaved(updated: TelLog) {
    setLogs(prev=>({...prev,[updated.cmiuid]:updated}));
  }

  // Agents list from CDR
  const agents = useMemo(() => Array.from(new Set(data.cdr.map(c=>c.agent).filter(Boolean))), [data.cdr]);

  // Client-side filtered CDR
  const filteredCdr = useMemo(() => {
    return data.cdr.filter(c => {
      // Direction filters include both answered AND missed calls
      if (filterType==='MISSED'   && !isMissed(c))  return false;
      if (filterType==='INBOUND'  && !isInbound(c)) return false;
      if (filterType==='OUTBOUND' && isInbound(c))  return false;
      if (filterAgent && c.agent !== filterAgent)    return false;
      if (filterDisp) {
        const l = logs[c.cmiuid];
        if (!l || l.disposition !== filterDisp) return false;
      }
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        const l = logs[c.cmiuid];
        const nm = (l?.callerName || c.name || '').toLowerCase();
        if (!nm.includes(q) && !String(c.from).includes(q) && !String(c.to).includes(q)) return false;
      }
      return true;
    });
  }, [data.cdr, logs, filterType, filterAgent, filterDisp, filterSearch]);

  useEffect(() => { setClientPage(1); }, [filterType, filterAgent, filterDisp, filterSearch]);

  const totalClientPages = Math.ceil(filteredCdr.length / PAGE_SIZE);
  const pagedCdr = filteredCdr.slice((clientPage-1)*PAGE_SIZE, clientPage*PAGE_SIZE);

  // Summary stats
  const statMissed   = filteredCdr.filter(isMissed).length;
  const statAnswered = filteredCdr.filter(c=>!isMissed(c)).length;
  const statTotalSec = filteredCdr.reduce((s,c)=>s+Number(c.billedsec),0);
  const statAvgSec   = statAnswered ? Math.round(statTotalSec/statAnswered) : 0;

  const hasActiveFilter = filterType!=='ALL' || filterAgent || filterDisp || filterSearch;
  const DATE_LABELS: Record<DateRange,string> = { today:'Today', yesterday:'Yesterday', last7:'Last 7 Days', last30:'Last 30 Days', custom:'Custom' };

  return (
    <div className="max-w-screen-2xl mx-auto space-y-5">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Call Activity</h1>
          <p className="text-sm text-slate-500 mt-0.5">TeleCMI · Real-time call logs & analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportCsv(filteredCdr, logs)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors">
            <FileDown size={14}/> Export CSV
          </button>
          <button onClick={() => { load(); setAutoSecs(AUTO_SECS); }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-xl hover:bg-[#1E293B] transition-colors">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Refresh
          </button>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total Calls"    value={filteredCdr.length} icon={<Phone size={18}/>}         color="text-[#0F172A]" bg="bg-slate-100"/>
        <StatCard label="Answered"       value={statAnswered}        icon={<PhoneIncoming size={18}/>} color="text-emerald-600" bg="bg-emerald-50"/>
        <StatCard label="Missed"         value={statMissed}          icon={<PhoneMissed size={18}/>}   color="text-red-600"    bg="bg-red-50"/>
        <StatCard label="Total Duration" value={fmtDur(statTotalSec)} icon={<Clock size={18}/>}        color="text-blue-600"   bg="bg-blue-50"/>
        <StatCard label="Avg Duration"   value={fmtDur(statAvgSec)}  sub="per answered call" icon={<Calendar size={18}/>} color="text-purple-600" bg="bg-purple-50"/>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Row 1: date + search + controls */}
        <div className="px-4 py-3 flex flex-wrap gap-2 items-center border-b border-slate-100">
          {/* Date pills */}
          <div className="flex gap-1.5 flex-wrap">
            {(['today','yesterday','last7','last30','custom'] as DateRange[]).map(r => (
              <button key={r} onClick={() => { setRange(r); setPage(1); setAutoSecs(AUTO_SECS); }}
                className={cn('px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap',
                  range===r ? 'bg-[#0F172A] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                {DATE_LABELS[r]}
              </button>
            ))}
          </div>
          {range==='custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} onChange={e=>{setCustomFrom(e.target.value);setPage(1);}}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#E11D48]"/>
              <span className="text-xs text-slate-400">to</span>
              <input type="date" value={customTo} onChange={e=>{setCustomTo(e.target.value);setPage(1);}}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#E11D48]"/>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={filterSearch} onChange={e=>setFilterSearch(e.target.value)}
                placeholder="Search name or number…"
                className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-44 focus:outline-none focus:border-[#E11D48] focus:w-56 transition-all"/>
            </div>
            {/* Filter toggle */}
            <button onClick={()=>setFiltersOpen(v=>!v)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                filtersOpen || hasActiveFilter
                  ? 'bg-[#E11D48] text-white border-[#E11D48]'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
              <Filter size={12}/>
              Filters
              {hasActiveFilter && <span className="h-1.5 w-1.5 rounded-full bg-white"/>}
            </button>
          </div>
        </div>

        {/* Row 2: expandable filters */}
        {filtersOpen && (
          <div className="px-4 py-3 flex flex-wrap gap-3 items-center bg-slate-50/50 border-b border-slate-100">
            {/* Type filter */}
            <div className="flex gap-1">
              {(['ALL','INBOUND','OUTBOUND','MISSED'] as FilterType[]).map(t => (
                <button key={t} onClick={()=>setFilterType(t)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    filterType===t ? 'bg-[#0F172A] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
                  {t==='ALL'?'All Types':t[0]+t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            {/* Agent filter */}
            {agents.length > 0 && (
              <select value={filterAgent} onChange={e=>setFilterAgent(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-[#E11D48] text-slate-600">
                <option value="">All Agents</option>
                {agents.map(a=><option key={a} value={a}>{a}</option>)}
              </select>
            )}
            {/* Disposition filter */}
            <select value={filterDisp} onChange={e=>setFilterDisp(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-[#E11D48] text-slate-600">
              <option value="">All Dispositions</option>
              {DISPOSITIONS.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            {/* Clear */}
            {hasActiveFilter && (
              <button onClick={()=>{setFilterType('ALL');setFilterAgent('');setFilterDisp('');setFilterSearch('');}}
                className="text-xs text-[#E11D48] font-semibold hover:underline">
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* CDR notice + auto-refresh */}
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-amber-600">
            <Info size={11}/>
            <span>CDR updates may take 5–15 min after a call ends</span>
          </div>
          {lastRefresh && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <RefreshCw size={10} className={loading ? 'animate-spin' : ''}/>
              {loading ? 'Refreshing…' : range==='today' ? `Auto in ${autoSecs}s` : lastRefresh.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
            </span>
          )}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-52">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin h-8 w-8 border-2 border-[#E11D48] border-t-transparent rounded-full"/>
              <span className="text-sm text-slate-400">Loading call logs…</span>
            </div>
          </div>
        ) : filteredCdr.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 text-slate-400">
            <Phone size={32} className="mb-3 opacity-20"/>
            <div className="text-sm font-medium">No calls found</div>
            <div className="text-xs mt-1">{hasActiveFilter ? 'Try adjusting your filters' : 'No calls for this period yet'}</div>
            {apiDebug && (
              <div className="mt-3 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 max-w-sm text-center">
                TeleCMI: {apiDebug}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['TYPE','CUSTOMER','AGENT','DURATION','DATE & TIME','DISPOSITION','RECORDING',''].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pagedCdr.map(call => {
                  const log  = logs[call.cmiuid] ?? null;
                  const disp = dispMeta(log?.disposition ?? null);
                  const missed  = isMissed(call);
                  const inbound = isInbound(call);
                  const name    = log?.callerName || call.name || '';
                  const cPhone  = customerPhone(call);
                  const displayName = name || fmtPhone(cPhone);

                  return (
                    <tr key={call.cmiuid}
                      className={cn('group transition-colors hover:bg-slate-50/80 cursor-default', missed && 'bg-red-50/30 hover:bg-red-50/60')}>

                      {/* Type — always show direction, add "No Ans" if missed */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          {inbound ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 w-fit">
                              <PhoneIncoming size={11}/> Inbound
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 w-fit">
                              <PhoneOutgoing size={11}/> Outbound
                            </span>
                          )}
                          {missed && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-500 w-fit">
                              <PhoneMissed size={9}/> No Answer
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                            missed ? 'bg-red-100 text-red-600' : inbound ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>
                            {initials(displayName, fmtPhone(cPhone))}
                          </div>
                          <div>
                            <div className={cn('text-[13px] font-semibold', name ? 'text-slate-800' : 'text-slate-400')}>
                              {displayName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">{fmtPhone(cPhone)}</div>
                          </div>
                          {log?.lead && (
                            <Link href={`/leads/${log.lead.id}`} className="text-blue-400 hover:text-blue-600" title={log.lead.name}>
                              <ExternalLink size={12}/>
                            </Link>
                          )}
                        </div>
                      </td>

                      {/* Agent */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-[#0F172A] flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                            {(call.agent||'?').slice(0,2).toUpperCase()}
                          </div>
                          <span className="text-xs text-slate-600 font-medium">{call.agent||'—'}</span>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Clock size={11} className="text-slate-400 shrink-0"/>
                          <span className={cn('text-xs font-medium', missed ? 'text-red-400' : 'text-slate-700')}>
                            {missed ? 'Missed' : fmtDur(Number(call.billedsec))}
                          </span>
                        </div>
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-slate-400 shrink-0"/>
                          <span className="text-xs text-slate-600 whitespace-nowrap">{fmtTime(call.time)}</span>
                        </div>
                      </td>

                      {/* Disposition */}
                      <td className="px-4 py-3.5">
                        {disp ? (
                          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold', disp.bg, disp.text)}>
                            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', disp.dot)}/>
                            {disp.label}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-300">—</span>
                        )}
                      </td>

                      {/* Recording */}
                      <td className="px-4 py-3.5">
                        {hasRecord(call) ? (
                          <button onClick={() => setPlayCall(call)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg text-[11px] font-semibold transition-colors">
                            <Play size={10} fill="white"/> Play
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-300">—</span>
                        )}
                      </td>

                      {/* Edit */}
                      <td className="px-4 py-3.5">
                        <button onClick={() => setEditCall(call)}
                          className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-[#E11D48] hover:border-red-200 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                          <Pencil size={13}/>
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
        {totalClientPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Showing {(clientPage-1)*PAGE_SIZE+1}–{Math.min(clientPage*PAGE_SIZE,filteredCdr.length)} of {filteredCdr.length} calls
            </span>
            <div className="flex items-center gap-1">
              <button disabled={clientPage===1} onClick={()=>setClientPage(p=>p-1)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-white transition-colors">
                <ChevronLeft size={14}/>
              </button>
              {Array.from({length:totalClientPages},(_,i)=>i+1).filter(p=>Math.abs(p-clientPage)<=2||p===1||p===totalClientPages).map((p,i,arr)=>(
                <span key={p}>
                  {i>0 && arr[i-1]!==p-1 && <span className="px-1 text-slate-300 text-xs">…</span>}
                  <button onClick={()=>setClientPage(p)}
                    className={cn('h-7 w-7 rounded-lg text-xs font-semibold transition-all',
                      p===clientPage ? 'bg-[#0F172A] text-white' : 'text-slate-600 hover:bg-slate-100')}>
                    {p}
                  </button>
                </span>
              ))}
              <button disabled={clientPage>=totalClientPages} onClick={()=>setClientPage(p=>p+1)}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-white transition-colors">
                <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {playCall && (
        <AudioModal
          call={playCall}
          callerName={logs[playCall.cmiuid]?.callerName || playCall.name || ''}
          onClose={() => setPlayCall(null)}
        />
      )}
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
