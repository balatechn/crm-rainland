import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export const LEAD_STATUSES = [
  'NEW','CONTACTED','FOLLOW_UP','INTERESTED',
  'TEST_DRIVE_SCHEDULED','TEST_DRIVE_COMPLETED',
  'QUOTATION_SENT','NEGOTIATION','BOOKING_CONFIRMED',
  'FINANCE_APPROVAL','DELIVERY_SCHEDULED','DELIVERED','LOST',
] as const;
export type LeadStatus = typeof LEAD_STATUSES[number];

export const STATUS_COLORS: Record<string,string> = {
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-cyan-100 text-cyan-700',
  FOLLOW_UP: 'bg-amber-100 text-amber-700',
  INTERESTED: 'bg-indigo-100 text-indigo-700',
  TEST_DRIVE_SCHEDULED: 'bg-violet-100 text-violet-700',
  TEST_DRIVE_COMPLETED: 'bg-purple-100 text-purple-700',
  QUOTATION_SENT: 'bg-pink-100 text-pink-700',
  NEGOTIATION: 'bg-fuchsia-100 text-fuchsia-700',
  BOOKING_CONFIRMED: 'bg-emerald-100 text-emerald-700',
  FINANCE_APPROVAL: 'bg-teal-100 text-teal-700',
  DELIVERY_SCHEDULED: 'bg-lime-100 text-lime-700',
  DELIVERED: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
};

export function inr(n: number) {
  return '₹ ' + Number(n || 0).toLocaleString('en-IN');
}
