'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function WhatsappPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [mobile, setMobile] = useState('');
  const [body, setBody] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [campaign, setCampaign] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  async function load() { setMessages(await api('/whatsapp/messages')); }
  useEffect(() => { load(); api<any[]>('/leads').then(setLeads); }, []);

  async function send() {
    if (!mobile || !body) return;
    await api('/whatsapp/send', { method:'POST', body: JSON.stringify({ mobile, body }) });
    setBody(''); load();
  }
  async function broadcast() {
    const ids = Object.entries(selected).filter(([,v])=>v).map(([k])=>k);
    if (!ids.length || !body || !campaign) return;
    await api('/whatsapp/broadcast', { method:'POST', body: JSON.stringify({ campaign, body, leadIds: ids }) });
    setSelected({}); setBody(''); setCampaign(''); load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">WhatsApp</h1>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4 space-y-2">
          <h3 className="font-semibold">Send Direct Message</h3>
          <input className="input" placeholder="Mobile (10-digit)" value={mobile} onChange={e=>setMobile(e.target.value)} />
          <textarea className="textarea" rows={3} placeholder="Message" value={body} onChange={e=>setBody(e.target.value)} />
          <button className="btn btn-primary" onClick={send}>Send</button>
          <p className="text-xs text-gray-500">Provider integration: set <code>WHATSAPP_API_URL</code> / <code>WHATSAPP_API_TOKEN</code> on the API.</p>
        </div>

        <div className="card p-4 space-y-2">
          <h3 className="font-semibold">Broadcast Campaign</h3>
          <input className="input" placeholder="Campaign name (e.g. Diwali Offer)" value={campaign} onChange={e=>setCampaign(e.target.value)} />
          <textarea className="textarea" rows={3} placeholder="Message body" value={body} onChange={e=>setBody(e.target.value)} />
          <div className="max-h-40 overflow-y-auto border rounded p-2 text-sm">
            {leads.map(l => (
              <label key={l.id} className="flex items-center gap-2 py-0.5">
                <input type="checkbox" checked={!!selected[l.id]} onChange={e=>setSelected(s=>({...s, [l.id]: e.target.checked}))} />
                <span>{l.name} — {l.mobile}</span>
              </label>
            ))}
          </div>
          <button className="btn btn-primary" onClick={broadcast}>Broadcast</button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Time</th><th>Direction</th><th>Mobile</th><th>Body</th><th>Campaign</th><th>Status</th></tr></thead>
          <tbody>
            {messages.map(m => (
              <tr key={m.id}>
                <td>{new Date(m.createdAt).toLocaleString()}</td>
                <td>{m.direction}</td>
                <td>{m.mobile}</td>
                <td className="max-w-md truncate" title={m.body}>{m.body}</td>
                <td>{m.campaign || '-'}</td>
                <td>{m.status || '-'}</td>
              </tr>
            ))}
            {messages.length===0 && <tr><td colSpan={6} className="text-center text-gray-500 py-4">No messages</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
