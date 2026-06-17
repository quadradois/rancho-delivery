'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import '@/styles/foodflow-theme.css';
import {
  superadminApi,
  getSuperadminToken,
  clearSuperadminToken,
  SUPERADMIN_UNAUTHORIZED_EVENT,
} from '@/lib/superadmin-client';
import { useToast } from '@/contexts/ToastContext';

const NAV = [
  { href: '/superadmin', label: 'Restaurantes', exact: true },
  { href: '/superadmin/planos', label: 'Planos', exact: false, embreve: true },
];

function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={className} style={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
      Food<span style={{ color: 'var(--color-accent)' }}>Flow</span>
    </span>
  );
}

export default function SuperadminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { showError } = useToast();
  const reduce = useReducedMotion();

  const [authReady, setAuthReady] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(0);

  useEffect(() => {
    setAuthToken(getSuperadminToken());
    setAuthReady(true);
    const onUnauthorized = () => setAuthToken(null);
    window.addEventListener(SUPERADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(SUPERADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const token = await superadminApi.login(form.username, form.password);
      setAuthToken(token);
      setForm({ username: '', password: '' });
    } catch (err) {
      setShake((n) => n + 1);
      showError('Falha no login', err instanceof Error ? err.message : 'Confira usuário e senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSuperadminToken();
    setAuthToken(null);
  };

  if (!authReady) {
    return <div className="foodflow" />;
  }

  if (!authToken) {
    return (
      <div className="foodflow flex min-h-screen items-center justify-center p-6">
        <motion.div
          key={shake}
          initial={{ opacity: 0, y: 12 }}
          animate={shake > 0 && !reduce ? { opacity: 1, y: 0, x: [0, -8, 8, -6, 6, 0] } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm rounded-2xl border p-8"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <Wordmark className="text-2xl" />
          <p className="mt-1 mb-7 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Painel da plataforma
          </p>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="text"
              autoComplete="username"
              placeholder="Usuário"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-[var(--color-border-focus)]"
              style={{ background: 'var(--color-surface-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Senha"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-[var(--color-border-focus)]"
              style={{ background: 'var(--color-surface-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full px-4 py-3 text-sm font-bold transition disabled:opacity-60"
              style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="foodflow flex min-h-screen">
      <aside
        className="flex w-[var(--sidebar-width)] flex-col border-r p-4"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <Wordmark className="mb-8 px-2 text-xl" />
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            if (item.embreve) {
              return (
                <span
                  key={item.href}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  {item.label}
                  <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
                    em breve
                  </span>
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium transition"
                style={{
                  color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  background: active ? 'var(--color-accent-muted)' : 'transparent',
                  boxShadow: active ? 'inset 3px 0 0 var(--color-accent)' : 'none',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="mt-auto rounded-lg px-3 py-2 text-left text-sm transition"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Sair
        </button>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
