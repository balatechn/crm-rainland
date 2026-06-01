'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, apiUrl, getToken } from '@/lib/api';
import { inr } from '@/lib/utils';

export default function QuotationsPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api<any[]>('/quotations').then(setItems); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Quotations</h1>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Number</th><th>Date</th><th>Lead</th><th>Vehicle</th><th>Total</th><th>Created By</th><th></th></tr></thead>
          <tbody>
            {items.map(q => (
              <tr key={q.id}>
                <td>{q.number}</td>
                <td>{new Date(q.createdAt).toLocaleDateString()}</td>
                <td><Link className="text-brand hover:underline" href={`/leads/${q.lead.id}`}>{q.lead.name}</Link></td>
                <td>{q.vehicle.brand} {q.vehicle.model}</td>
                <td>{inr(q.total)}</td>
                <td>{q.createdBy?.name}</td>
                <td><a className="text-brand hover:underline" target="_blank" href={apiUrl(`/quotations/${q.id}/pdf?token=${getToken()}`)}>PDF</a></td>
              </tr>
            ))}
            {items.length===0 && <tr><td colSpan={7} className="text-center text-gray-500 py-4">No quotations</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">Open PDF requires JWT; if it fails when opened in new tab, use the lead detail page link.</p>
    </div>
  );
}
