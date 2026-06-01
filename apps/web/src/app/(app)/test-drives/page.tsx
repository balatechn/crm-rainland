'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function TestDrivesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  async function load() { setItems(await api('/test-drives')); }
  useEffect(() => { load(); }, []);

  async function complete(id: string) {
    await api(`/test-drives/${id}/complete`, { method:'PATCH', body: JSON.stringify({ feedback }) });
    setFeedbackFor(null); setFeedback(''); load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Test Drives</h1>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>When</th><th>Lead</th><th>Vehicle</th><th>Executive</th><th>Status</th><th>Feedback</th><th></th></tr></thead>
          <tbody>
            {items.map(t => (
              <tr key={t.id}>
                <td>{new Date(t.scheduledAt).toLocaleString()}</td>
                <td><Link className="text-brand hover:underline" href={`/leads/${t.lead.id}`}>{t.lead.name}</Link></td>
                <td>{t.vehicle.brand} {t.vehicle.model}</td>
                <td>{t.executive?.name}</td>
                <td>{t.completed ? <span className="badge bg-green-100 text-green-700">Completed</span> : <span className="badge bg-amber-100 text-amber-700">Scheduled</span>}</td>
                <td>{t.feedback || '-'}</td>
                <td>
                  {!t.completed && (
                    feedbackFor === t.id ? (
                      <div className="flex gap-1">
                        <input className="input w-40" placeholder="Feedback" value={feedback} onChange={e=>setFeedback(e.target.value)} />
                        <button className="btn btn-primary" onClick={() => complete(t.id)}>Done</button>
                      </div>
                    ) : (
                      <button className="btn btn-outline" onClick={() => setFeedbackFor(t.id)}>Complete</button>
                    )
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="text-center text-gray-500 py-4">No test drives</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
