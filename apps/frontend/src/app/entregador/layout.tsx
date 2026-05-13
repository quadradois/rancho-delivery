import type { Metadata, Viewport } from 'next';
import '@/styles/admin-theme.css';

export const metadata: Metadata = {
  title: 'Rancho — Entregador',
  description: 'App do entregador Rancho Delivery',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Rancho Entregador',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1e293b',
};

export default function EntregadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="crm-mode dark-mode min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      {children}
    </div>
  );
}
