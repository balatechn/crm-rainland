import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rainland CRM',
  description: 'Rainland Auto Corp CRM — Montra & Isuzu Dealership Operations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
