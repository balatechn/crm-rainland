'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Wifi, WifiOff, QrCode, RefreshCw, X, Send, Search, UserPlus,
  MessageCircle, Phone, ChevronRight, AlertCircle, CheckCheck,
  Loader2, Radio,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Convo = { mobile: string; lastMessage: string; direction: string; at: string; leadId?: string; leadName?: string };
type Msg   = { id: string; mobile: string; body: string; direction: string; createdAt: string; status?: string };

// ─── helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dt: string) {
  const d = new Date(dt), now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000)    return 'just now';
  if (diff < 3600000)  return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
function fmt(dt: string) {
  return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ─── QR Modal ─────────────────────────────────────────────────────────────────
function QRModal({ onClose }: { onClose: () => void }) {
  const [qr, setQR]           = useState<string | null>(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(true);

  const fetchQR = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await api<any>('/whatsapp/qr');
      if (data?.connected) {
        // Already connected — close modal
        onClose();
        return;
      }
      if (data?.error) {
        setError(data.error);
        setQR(null);
      } else if (data?.qr) {
        // Ensure it's a valid data URI (base64 image)
        const src = data.qr.startsWith('data:') ? data.qr : `data:image/png;base64,${data.qr}`;
        setQR(src);
      } else {
        setError('No QR code received. Is Evolution API running and the backend redeployed?');
      }
    } catch (e: any) {
      setError(`Request failed: ${e?.message || 'Unknown error'}`);
    } finally { setLoading(false); }
  }, [onClose]);

  // Poll status every 3s — close modal once connected
  useEffect(() => {
    fetchQR();
    const iv = setInterval(async () => {
      const s = await api<any>('/whatsapp/status').catch(() => null);
      if (s?.state === 'open') { clearInterval(iv); onClose(); }
    }, 3000);
    return () => clearInterval(iv);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between bg-green-600 px-5 py-3.5">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Wifi size={18} /> Connect WhatsApp
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-4 min-h-[280px] justify-center">
          {loading ? (
            <Loader2 size={40} className="text-green-600 animate-spin" />
          ) : error ? (
            <>
              <AlertCircle size={40} className="text-red-500" />
              <p className="text-sm text-red-600 text-center">{error}</p>
              <button onClick={fetchQR} className="flex items-center gap-2 text-sm text-green-600 hover:underline">
                <RefreshCw size={14} /> Retry
              </button>
            </>
          ) : qr ? (
            <>
              <img src={qr} alt="QR Code" className="w-56 h-56 rounded-lg border border-gray-200" />
              <p className="text-xs text-gray-500 text-center">Scan with WhatsApp → Linked Devices → Link a Device</p>
              <button onClick={fetchQR} className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600">
                <RefreshCw size={12} /> Refresh QR
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-500">Waiting…</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New Chat Modal ────────────────────────────────────────────────────────────
function NewChatModal({ onClose, onStart }: { onClose: () => void; onStart: (mobile: string) => void }) {
  const [mobile, setMobile] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-5 space-y-3">
        <h3 className="font-semibold text-gray-800">New Chat with Contact</h3>
        <input value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0,10))}
          placeholder="Enter 10-digit mobile number"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-green-500" />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-outline px-3 py-1.5 text-sm">Cancel</button>
          <button disabled={mobile.length < 10}
            onClick={() => { onStart(mobile); onClose(); }}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm rounded-lg disabled:opacity-50">
            Start Chat
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function WhatsappPage() {
  const [status, setStatus]         = useState<'open'|'close'|'connecting'>('connecting');
  const [convos, setConvos]         = useState<Convo[]>([]);
  const [activeConvo, setActive]    = useState<string | null>(null);
  const [msgs, setMsgs]             = useState<Msg[]>([]);
  const [msgText, setMsgText]       = useState('');
  const [search, setSearch]         = useState('');
  const [showQR, setShowQR]         = useState(false);
  const [showNewChat, setNewChat]   = useState(false);
  const [sending, setSending]       = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const pollRef   = useRef<any>(null);

  const loadStatus = useCallback(async () => {
    const s = await api<any>('/whatsapp/status').catch(() => ({ state: 'close' }));
    setStatus(s?.state === 'open' ? 'open' : 'close');
  }, []);

  const loadConvos = useCallback(async () => {
    const data = await api<Convo[]>('/whatsapp/conversations').catch(() => []);
    setConvos(data || []);
  }, []);

  const loadMsgs = useCallback(async (mobile: string) => {
    const data = await api<Msg[]>(`/whatsapp/messages?mobile=${mobile}`).catch(() => []);
    setMsgs((data || []).reverse());
    setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  useEffect(() => {
    loadStatus();
    loadConvos();
    // Poll for new messages every 5s
    pollRef.current = setInterval(() => {
      loadConvos();
      if (activeConvo) loadMsgs(activeConvo);
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [loadStatus, loadConvos, loadMsgs, activeConvo]);

  function selectConvo(mobile: string) {
    setActive(mobile);
    loadMsgs(mobile);
  }

  async function sendMsg() {
    if (!msgText.trim() || !activeConvo || sending) return;
    setSending(true);
    const convo = convos.find(c => c.mobile === activeConvo);
    await api('/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify({ mobile: activeConvo, body: msgText, leadId: convo?.leadId }),
    }).catch(() => {});
    setMsgText('');
    await loadMsgs(activeConvo);
    await loadConvos();
    setSending(false);
  }

  const filtered = convos.filter(c =>
    c.mobile.includes(search) || (c.leadName || '').toLowerCase().includes(search.toLowerCase())
  );
  const activeData = convos.find(c => c.mobile === activeConvo);

  return (
    <div className="flex h-[calc(100vh-64px)] -m-4 md:-m-6 overflow-hidden bg-gray-50">

      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Conversations</h2>
          <div className="flex items-center gap-2">
            {status === 'open' ? (
              <button onClick={() => api('/whatsapp/disconnect', { method: 'DELETE' }).then(loadStatus)}
                title="Connected – click to disconnect"
                className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full hover:bg-green-100 transition-colors">
                <Radio size={12} className="animate-pulse" /> Connected
              </button>
            ) : (
              <button onClick={() => setShowQR(true)}
                className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-2.5 py-1 rounded-full hover:bg-green-700 transition-colors">
                <QrCode size={12} /> Connect
              </button>
            )}
            <button onClick={() => setNewChat(true)} title="New Chat"
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <UserPlus size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5">
            <Search size={14} className="text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400" />
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 p-6">
              <MessageCircle size={32} className="opacity-30" />
              <p className="text-sm text-center">No conversations yet.<br/>Connect WhatsApp to start.</p>
            </div>
          ) : filtered.map(c => (
            <button key={c.mobile} onClick={() => selectConvo(c.mobile)}
              className={`w-full text-left px-4 py-3 border-b border-gray-50 flex items-start gap-3 hover:bg-gray-50 transition-colors
                ${activeConvo === c.mobile ? 'bg-green-50 border-l-4 border-l-green-500' : ''}`}>
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-green-700 font-semibold text-sm">
                {(c.leadName || c.mobile).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 truncate">{c.leadName || c.mobile}</span>
                  <span className="text-[11px] text-gray-400 flex-shrink-0 ml-1">{timeAgo(c.at)}</span>
                </div>
                {c.leadName && <div className="text-[11px] text-gray-400 flex items-center gap-1"><Phone size={10}/>{c.mobile}</div>}
                <div className="flex items-center gap-1 mt-0.5">
                  {c.direction === 'OUTBOUND' && <CheckCheck size={12} className="text-green-500 flex-shrink-0" />}
                  <span className="text-xs text-gray-500 truncate">{c.lastMessage}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right chat area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeConvo ? (
          <>
            {/* Chat header */}
            <div className="px-5 py-3 bg-white border-b border-gray-200 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm">
                {(activeData?.leadName || activeConvo).charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">{activeData?.leadName || activeConvo}</div>
                <div className="text-xs text-gray-400 flex items-center gap-1">
                  <Phone size={10}/> {activeConvo}
                  {activeData?.leadId && (
                    <a href={`/leads/${activeData.leadId}`} className="ml-2 text-brand hover:underline flex items-center gap-0.5 text-[11px]">
                      View Lead <ChevronRight size={10}/>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2"
              style={{ backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px', backgroundColor: '#f3f4f6' }}>
              {msgs.length === 0 && (
                <div className="flex justify-center items-center h-full text-gray-400 text-sm">No messages yet</div>
              )}
              {msgs.map(m => {
                const out = m.direction === 'OUTBOUND';
                return (
                  <div key={m.id} className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl shadow-sm text-sm leading-relaxed
                      ${out ? 'bg-green-500 text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm'}`}>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <div className={`text-[10px] mt-1 flex items-center gap-1 ${out ? 'text-green-100 justify-end' : 'text-gray-400'}`}>
                        {fmt(m.createdAt)}
                        {out && <CheckCheck size={11} />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={msgEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-end gap-3">
              <textarea
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                placeholder="Type a message…"
                rows={1}
                className="flex-1 resize-none border border-gray-300 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500 max-h-32 overflow-y-auto"
              />
              <button onClick={sendMsg} disabled={!msgText.trim() || sending}
                className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 disabled:opacity-40 transition-colors flex-shrink-0">
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
            <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center">
              <MessageCircle size={42} className="text-green-300" />
            </div>
            <div className="text-center">
              <p className="text-gray-600 font-medium">Select a conversation</p>
              <p className="text-sm mt-1">from the left to start chatting</p>
            </div>
            <button onClick={() => setNewChat(true)}
              className="mt-2 flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-full text-sm hover:bg-green-700 transition-colors">
              <UserPlus size={15} /> New Chat with Contact
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showQR     && <QRModal onClose={() => { setShowQR(false); loadStatus(); loadConvos(); }} />}
      {showNewChat && <NewChatModal onClose={() => setNewChat(false)} onStart={m => selectConvo(m)} />}
    </div>
  );
}
