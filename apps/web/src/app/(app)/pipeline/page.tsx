'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { LEAD_STATUSES, STATUS_COLORS } from '@/lib/utils';

export default function PipelinePage() {
  const [leads, setLeads] = useState<any[]>([]);
  useEffect(() => { api<any[]>('/leads').then(setLeads); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Sales Pipeline</h1>
      <div className="overflow-x-auto">
        <div className="flex gap-3 min-w-max pb-4">
          {LEAD_STATUSES.map(status => {
            const items = leads.filter(l => l.status === status);
            return (
              <div key={status} className="w-72 flex-shrink-0">
                <div className="card p-2 mb-2">
                  <div className={`badge ${STATUS_COLORS[status]}`}>{status}</div>
                  <span className="ml-2 text-xs text-gray-500">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map(l => (
                    <Link href={`/leads/${l.id}`} key={l.id} className="card p-3 block hover:shadow-md transition">
                      <div className="font-medium">{l.name}</div>
                      <div className="text-xs text-gray-500">{l.mobile}</div>
                      <div className="text-xs mt-1">{l.vehicle ? `${l.vehicle.brand} ${l.vehicle.model}` : '—'}</div>
                      <div className="text-xs text-gray-500">{l.branch?.name} · {l.assignedTo?.name || 'Unassigned'}</div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
