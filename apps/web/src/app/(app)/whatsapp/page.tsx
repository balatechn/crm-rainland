'use client';
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { RefreshCw, Wifi, WifiOff, Link2Off } from 'lucide-react';

type Status = {
  state?: string;   // open | connecting | close
  instance?: string;
  qrcode?: string;  // base64 QR image from Evolution
};

export default function WhatsAppPage() {
  const [status,    setStatus]    = useState<Status | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [qrLoading, setQrLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await api('/whatsapp/status');
      setStatus(s ?? {});
    } catch (e: any) {
      setError(e?.message ?? 'Failed to reach backend');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQR = useCallback(async () => {
    setQrLoading(true);
    setError(null);
    try {
      const r = await api('/whatsapp/qr');
      setStatus(prev => ({ ...prev, qrcode: r?.qrcode ?? r?.base64 ?? r?.code }));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to get QR code');
    } finally {
      setQrLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!confirm('Disconnect the WhatsApp account from this instance?')) return;
    try {
      await api('/whatsapp/disconnect', { method: 'DELETE' });
      await fetchStatus();
    } catch (e: any) {
      setError(e?.message ?? 'Disconnect failed');
    }
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();
    const t = setInterval(fetchStatus, 30_000);
    return () => clearInterval(t);
  }, [fetchStatus]);

  const isConnected = status?.state === 'open';
  const isConnecting = status?.state === 'connecting' || status?.state === 'close';

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">WhatsApp</h1>
        <button className="btn btn-outline btn-sm flex items-center gap-1" onClick={fetchStatus} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="card p-3 bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Status card */}
      <div className="card p-4 flex items-center gap-4">
        {isConnected
          ? <Wifi size={32} className="text-green-500 shrink-0" />
          : <WifiOff size={32} className="text-slate-400 shrink-0" />}
        <div className="flex-1">
          <p className="font-semibold text-lg">
            {loading ? 'Checking…'
              : isConnected ? 'Connected'
              : isConnecting ? 'Not linked — scan QR to connect'
              : 'Unknown'}
          </p>
          {status?.instance && (
            <p className="text-sm text-slate-500">Instance: <span className="font-mono">{status.instance}</span></p>
          )}
          {status?.state && (
            <p className="text-xs text-slate-400 mt-0.5">State: {status.state}</p>
          )}
        </div>
        {isConnected && (
          <button className="btn btn-outline btn-sm text-red-600 flex items-center gap-1" onClick={disconnect}>
            <Link2Off size={14} /> Disconnect
          </button>
        )}
      </div>

      {/* QR code section — only show when not connected */}
      {!isConnected && !loading && (
        <div className="card p-4 space-y-3">
          <p className="text-sm text-slate-600">
            Scan the QR code below with WhatsApp on the phone number you want to use for alerts.
            Go to <strong>WhatsApp → Linked Devices → Link a Device</strong>.
          </p>

          {status?.qrcode ? (
            <div className="flex flex-col items-center gap-3">
              <img
                src={status.qrcode.startsWith('data:') ? status.qrcode : `data:image/png;base64,${status.qrcode}`}
                alt="WhatsApp QR Code"
                className="border border-slate-200 rounded-lg"
                style={{ width: 240, height: 240 }}
              />
              <p className="text-xs text-slate-400">QR expires in ~60 seconds — click Refresh QR if it expires</p>
              <button className="btn btn-outline btn-sm" onClick={fetchQR} disabled={qrLoading}>
                {qrLoading ? 'Loading…' : 'Refresh QR'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-sm text-slate-500">Click below to generate the QR code.</p>
              <button className="btn btn-primary" onClick={fetchQR} disabled={qrLoading}>
                {qrLoading ? 'Generating…' : 'Get QR Code'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="card p-4 text-sm text-slate-600 space-y-2">
        <p className="font-semibold text-slate-800">Setup checklist</p>
        <ol className="list-decimal list-inside space-y-1 text-slate-600">
          <li>Connect a WhatsApp number using the QR code above.</li>
          <li>Go to <strong>Masters → Branches</strong> and edit each branch to set the WhatsApp number and/or group JID.</li>
          <li>When a telecaller marks a test drive request, alerts will be sent automatically.</li>
        </ol>
      </div>
    </div>
  );
}
