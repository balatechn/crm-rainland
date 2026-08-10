'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type CallRecord = {
  cmiuid: string; duration: number; billedsec: number; agent: string;
  from: string | number; to: string | number; time: string | number;
  _direction?: 'inbound' | 'outbound';
  _answered?: boolean;
};
type CallsResponse = { count: number; cdr: CallRecord[] };
type DateRange = 'today' | 'yesterday' | 'last7' | 'last30' | 'custom';

const toUtcTs = (d: Date) => Math.floor(d.getTime() / 1000);
const isMissed  = (c: CallRecord) => c._answered === false;
const isInbound = (c: CallRecord) => c._direction === 'inbound';

function getDateBounds(range: DateRange, from: string, to: string) {
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
  const s = from ? new Date(from+'T00:00:00') : new Date(); s.setHours(0,0,0,0);
  const e = to   ? new Date(to+'T23:59:59')   : new Date();
  return { start_date: toUtcTs(s), end_date: toUtcTs(e) };
}

function fmtDur(sec: number) {
  if (!sec) return '0s';
  const m = Math.floor(sec/60), s = sec%60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtDay(ts: number) {
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

const C = { inbound: '#10B981', outbound: '#3B82F6', missed: '#EF4444', purple: '#8B5CF6', rose: '#E11D48' };

const RANGES: { label: string; value: DateRange }[] = [
  { label: 'Today',       value: 'today' },
  { label: 'Yesterday',   value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last7' },
  { label: 'Last 30 Days',value: 'last30' },
  { label: 'Custom',      value: 'custom' },
];

const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0/0.1)' };
const TICK = { fontSize: 11, fill: '#94a3b8' };

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-100 shadow-sm p-5', className)}>
      <h2 className="text-sm font-semibold text-slate-700 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ h = 200 }: { h?: number }) {
  return <div style={{ height: h }} className="flex items-center justify-center text-slate-300 text-sm">No data for this period</div>;
}
function Loading({ h = 200 }: { h?: number }) {
  return <div style={{ height: h }} className="flex items-center justify-center text-slate-200 text-sm">Loading…</div>;
}

export default function CallReportsPage() {
  const [cdr,       setCdr]       = useState<CallRecord[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [range,     setRange]     = useState<DateRange>('last7');
  const [customFrom,setCustomFrom]= useState('');
  const [customTo,  setCustomTo]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const bounds = getDateBounds(range, customFrom, customTo);
      const q = new URLSearchParams({
        start_date: String(bounds.start_date),
        end_date:   String(bounds.end_date),
        page: '1', limit: '20',
      });
      const res = await api<CallsResponse>(`/telephone/calls?${q}`);
      setCdr(res?.cdr ?? []);
    } catch { setCdr([]); }
    setLoading(false);
  }, [range, customFrom, customTo]);

  useEffect(() => { load(); }, [load]);

  // ── Derived stats ────────────────────────────────────────────────────────────
  const answeredCdr = useMemo(() => cdr.filter(c => !isMissed(c)), [cdr]);
  const missedCdr   = useMemo(() => cdr.filter(isMissed), [cdr]);
  const inboundCdr  = useMemo(() => cdr.filter(c => isInbound(c) && !isMissed(c)), [cdr]);
  const outboundCdr = useMemo(() => cdr.filter(c => !isInbound(c) && !isMissed(c)), [cdr]);
  const avgDuration = answeredCdr.length
    ? Math.round(answeredCdr.reduce((s, c) => s + Number(c.billedsec), 0) / answeredCdr.length)
    : 0;

  // ── Calls per day ────────────────────────────────────────────────────────────
  const callsByDay = useMemo(() => {
    const map = new Map<number, { ts: number; Inbound: number; Outbound: number; Missed: number }>();
    cdr.forEach(c => {
      const d = new Date(Number(c.time));
      d.setHours(0,0,0,0);
      const ts = d.getTime();
      if (!map.has(ts)) map.set(ts, { ts, Inbound: 0, Outbound: 0, Missed: 0 });
      const entry = map.get(ts)!;
      if (isMissed(c)) entry.Missed++;
      else if (isInbound(c)) entry.Inbound++;
      else entry.Outbound++;
    });
    return [...map.values()]
      .sort((a, b) => a.ts - b.ts)
      .map(({ ts, Inbound, Outbound, Missed }) => ({ date: fmtDay(ts), Inbound, Outbound, Missed }));
  }, [cdr]);

  // ── Calls by hour ────────────────────────────────────────────────────────────
  const callsByHour = useMemo(() => {
    const map: Record<number, number> = {};
    for (let i = 7; i <= 21; i++) map[i] = 0;
    cdr.forEach(c => {
      const h = new Date(Number(c.time)).getHours();
      if (h >= 7 && h <= 21) map[h] = (map[h] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a],[b]) => Number(a)-Number(b))
      .map(([h, Calls]) => ({ hour: `${String(h).padStart(2,'0')}:00`, Calls }));
  }, [cdr]);

  // ── Direction split donut ────────────────────────────────────────────────────
  const directionData = useMemo(() => [
    { name: 'Inbound',  value: inboundCdr.length,  color: C.inbound  },
    { name: 'Outbound', value: outboundCdr.length, color: C.outbound },
    { name: 'Missed',   value: missedCdr.length,   color: C.missed   },
  ].filter(d => d.value > 0), [inboundCdr, outboundCdr, missedCdr]);

  // ── Top agents ───────────────────────────────────────────────────────────────
  const agentData = useMemo(() => {
    const map: Record<string, number> = {};
    cdr.forEach(c => {
      const ext = String(c.agent || 'Unknown').split('_')[0];
      map[ext] = (map[ext] || 0) + 1;
    });
    return Object.entries(map)
      .map(([agent, Calls]) => ({ agent, Calls }))
      .sort((a, b) => b.Calls - a.Calls)
      .slice(0, 8);
  }, [cdr]);

  // ── Avg duration by day ──────────────────────────────────────────────────────
  const durationByDay = useMemo(() => {
    const map = new Map<number, { ts: number; total: number; count: number }>();
    answeredCdr.forEach(c => {
      const d = new Date(Number(c.time)); d.setHours(0,0,0,0);
      const ts = d.getTime();
      if (!map.has(ts)) map.set(ts, { ts, total: 0, count: 0 });
      const e = map.get(ts)!;
      e.total += Number(c.billedsec); e.count++;
    });
    return [...map.values()]
      .sort((a, b) => a.ts - b.ts)
      .map(({ ts, total, count }) => ({ date: fmtDay(ts), 'Avg (s)': Math.round(total/count) }));
  }, [answeredCdr]);

  // ── Answer rate by day ───────────────────────────────────────────────────────
  const answerRateByDay = useMemo(() => {
    const map = new Map<number, { ts: number; answered: number; total: number }>();
    cdr.forEach(c => {
      const d = new Date(Number(c.time)); d.setHours(0,0,0,0);
      const ts = d.getTime();
      if (!map.has(ts)) map.set(ts, { ts, answered: 0, total: 0 });
      const e = map.get(ts)!;
      e.total++;
      if (!isMissed(c)) e.answered++;
    });
    return [...map.values()]
      .sort((a, b) => a.ts - b.ts)
      .map(({ ts, answered, total }) => ({
        date: fmtDay(ts),
        'Answer Rate %': Math.round((answered/total)*100),
      }));
  }, [cdr]);

  const total = cdr.length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Call Reports</h1>
            <p className="text-xs text-slate-400 mt-0.5">TeleCMI · Call analytics for management</p>
          </div>
          <button onClick={load}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors">
            <RefreshCw size={14} className={cn(loading && 'animate-spin')}/> Refresh
          </button>
        </div>

        {/* Date range tabs */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {RANGES.map(r => (
            <button key={r.value} onClick={() => setRange(r.value)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                range === r.value ? 'bg-[#E11D48] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              {r.label}
            </button>
          ))}
          {range === 'custom' && (
            <div className="flex items-center gap-2 ml-1">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#E11D48]"/>
              <span className="text-xs text-slate-400">to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#E11D48]"/>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Calls',   value: total,              icon: Phone,         color: 'text-slate-600',  bg: 'bg-slate-100' },
            { label: 'Inbound',       value: inboundCdr.length,  icon: PhoneIncoming,  color: 'text-emerald-600',bg: 'bg-emerald-50' },
            { label: 'Outbound',      value: outboundCdr.length, icon: PhoneOutgoing,  color: 'text-blue-600',   bg: 'bg-blue-50' },
            { label: 'Missed',        value: missedCdr.length,   icon: PhoneMissed,    color: 'text-red-500',    bg: 'bg-red-50' },
            { label: 'Avg Duration',  value: fmtDur(avgDuration),icon: Clock,          color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
              <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center mb-3', bg)}>
                <Icon size={18} className={color}/>
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Row 1: Calls per day + Direction split ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Calls Per Day" className="lg:col-span-2">
            {loading ? <Loading/> : callsByDay.length === 0 ? <Empty/> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={callsByDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="date" tick={TICK} axisLine={false} tickLine={false}/>
                  <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip contentStyle={TOOLTIP_STYLE}/>
                  <Legend wrapperStyle={{ fontSize: 12 }}/>
                  <Bar dataKey="Inbound"  stackId="a" fill={C.inbound}  radius={[0,0,0,0]}/>
                  <Bar dataKey="Outbound" stackId="a" fill={C.outbound} radius={[0,0,0,0]}/>
                  <Bar dataKey="Missed"   stackId="a" fill={C.missed}   radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="Call Direction Split">
            {loading ? <Loading/> : directionData.length === 0 ? <Empty/> : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={directionData} cx="50%" cy="50%" innerRadius={50} outerRadius={72}
                      dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                      {directionData.map((d, i) => <Cell key={i} fill={d.color}/>)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-1">
                  {directionData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }}/>
                        <span className="text-slate-600">{d.name}</span>
                      </div>
                      <span className="font-semibold text-slate-800">
                        {d.value}
                        {total > 0 && <span className="text-slate-400 font-normal ml-1">({Math.round(d.value/total*100)}%)</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* ── Row 2: Calls by hour + Top agents ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Calls by Hour of Day (7am – 9pm)">
            {loading ? <Loading/> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={callsByHour} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip contentStyle={TOOLTIP_STYLE}/>
                  <Bar dataKey="Calls" fill={C.rose} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="Calls by Agent">
            {loading ? <Loading/> : agentData.length === 0 ? <Empty/> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={agentData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
                  <XAxis type="number" tick={TICK} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <YAxis dataKey="agent" type="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={50}/>
                  <Tooltip contentStyle={TOOLTIP_STYLE}/>
                  <Bar dataKey="Calls" fill={C.outbound} radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* ── Row 3: Avg duration + Answer rate ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Average Call Duration by Day (seconds)">
            {loading ? <Loading/> : durationByDay.length === 0 ? <Empty/> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={durationByDay} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="date" tick={TICK} axisLine={false} tickLine={false}/>
                  <YAxis tick={TICK} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}s`, 'Avg Duration']}/>
                  <Line type="monotone" dataKey="Avg (s)" stroke={C.purple} strokeWidth={2.5}
                    dot={{ r: 4, fill: C.purple, strokeWidth: 0 }} activeDot={{ r: 6 }}/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="Answer Rate by Day (%)">
            {loading ? <Loading/> : answerRateByDay.length === 0 ? <Empty/> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={answerRateByDay} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="date" tick={TICK} axisLine={false} tickLine={false}/>
                  <YAxis tick={TICK} axisLine={false} tickLine={false} domain={[0,100]} unit="%"/>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`, 'Answer Rate']}/>
                  <Line type="monotone" dataKey="Answer Rate %" stroke={C.inbound} strokeWidth={2.5}
                    dot={{ r: 4, fill: C.inbound, strokeWidth: 0 }} activeDot={{ r: 6 }}/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
