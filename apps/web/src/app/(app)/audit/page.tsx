'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function AuditPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api<any[]>('/audit-logs').then(setItems); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Entity ID</th></tr></thead>
          <tbody>
            {items.map(a => (
              <tr key={a.id}>
                <td>{new Date(a.createdAt).toLocaleString()}</td>
                <td>{a.user?.name || '-'}</td>
                <td>{a.action}</td>
                <td>{a.entity}</td>
                <td className="text-xs">{a.entityId || '-'}</td>
              </tr>
            ))}
            {items.length===0 && <tr><td colSpan={5} className="text-center text-gray-500 py-4">No audit entries yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
