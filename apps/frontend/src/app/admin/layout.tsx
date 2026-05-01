'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import '@/styles/admin-theme.css';
import api from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

const NAV_ITEMS = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: '/admin/produtos',
    label: 'Produtos',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    href: '/admin/bairros',
    label: 'Entregas',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
        <rect x="9" y="11" width="14" height="10" rx="2" />
        <circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      </svg>
    ),
  },
  {
    href: '/admin/pedidos',
    label: 'Pedidos',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    href: '/admin/configuracoes',
    label: 'Configurações',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { showError } = useToast();
  const [mode, setMode] = useState<'dark-mode' | 'light-mode'>('dark-mode');
  const [authReady, setAuthReady] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [whatsConnected, setWhatsConnected] = useState(false);
  const [whatsInstanceName, setWhatsInstanceName] = useState<string>('');
  const [showWhatsModal, setShowWhatsModal] = useState(false);
  const [whatsQrCode, setWhatsQrCode] = useState<string | null>(null);
  const [whatsLoading, setWhatsLoading] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('rancho:admin:theme');
    if (saved === 'dark-mode' || saved === 'light-mode') {
      setMode(saved);
      return;
    }
    window.localStorage.setItem('rancho:admin:theme', 'dark-mode');
  }, []);

  useEffect(() => {
    setAuthToken(window.localStorage.getItem('rancho:admin:token'));
    setAuthReady(true);

    const onUnauthorized = () => {
      setAuthToken(null);
    };
    window.addEventListener('rancho:admin:unauthorized', onUnauthorized);
    return () => window.removeEventListener('rancho:admin:unauthorized', onUnauthorized);
  }, []);

  useEffect(() => {
    if (!authToken) return;
    if (!showWhatsModal) return;

    let active = true;
    const checkConnection = async () => {
      try {
        const data = await api.adminClientes.statusWhatsApp();
        if (!active) return;

        const conectado = Boolean(data.conectado);
        setWhatsConnected(conectado);
        setWhatsInstanceName(data.instanceName || '');

        if (conectado) {
          setShowWhatsModal(false);
          setWhatsQrCode(null);
        }
      } catch {
        // ignore polling errors while modal is open
      }
    };

    void checkConnection();
    const id = window.setInterval(() => {
      void checkConnection();
    }, 3000);

    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [authToken, showWhatsModal]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('dark-mode', 'light-mode');
    html.classList.add(mode);
    window.localStorage.setItem('rancho:admin:theme', mode);
  }, [mode]);

  useEffect(() => {
    if (!authToken) return;
    let mounted = true;
    let intervalId: number | null = null;

    const loadStatus = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const data = await api.adminClientes.statusWhatsApp();
        if (mounted) {
          setWhatsConnected(Boolean(data.conectado));
          setWhatsInstanceName(data.instanceName || '');
        }
      } catch {
        if (mounted) {
          setWhatsConnected(false);
          setWhatsInstanceName('');
        }
      }
    };

    void loadStatus();
    intervalId = window.setInterval(() => {
      void loadStatus();
    }, 30000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void loadStatus();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mounted = false;
      if (intervalId) window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [authToken]);

  const toggleMode = () => {
    setMode((prev) => (prev === 'dark-mode' ? 'light-mode' : 'dark-mode'));
  };

  const prepararConexaoWhatsApp = async () => {
    setWhatsLoading(true);
    try {
      const data = await api.adminClientes.prepararWhatsApp();
      const conectado = Boolean(data.conectado);
      setWhatsConnected(conectado);
      setWhatsInstanceName(data.instanceName || '');
      setWhatsQrCode(data.qrCodeBase64 || null);
      setShowWhatsModal(!conectado);
    } catch (err) {
      showError(
        'Falha ao conectar WhatsApp',
        err instanceof Error ? err.message : 'Verifique se a Evolution API está acessível'
      );
    } finally {
      setWhatsLoading(false);
    }
  };

  const atualizarQrCode = async () => {
    setWhatsLoading(true);
    try {
      const data = await api.adminClientes.atualizarQrCodeWhatsApp();
      setWhatsConnected(Boolean(data.conectado));
      setWhatsInstanceName(data.instanceName || '');
      setWhatsQrCode(data.qrCodeBase64 || null);
    } catch (err) {
      showError(
        'Falha ao atualizar QR Code',
        err instanceof Error ? err.message : 'Verifique se a Evolution API está acessível'
      );
    } finally {
      setWhatsLoading(false);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginLoading(true);
    try {
      const data = await api.adminAuth.login(loginForm.username, loginForm.password);
      window.localStorage.setItem('rancho:admin:token', data.token);
      setAuthToken(data.token);
      setLoginForm({ username: '', password: '' });
    } catch (err) {
      showError('Falha no login', err instanceof Error ? err.message : 'Confira usuário e senha.');
    } finally {
      setLoginLoading(false);
    }
  };

  if (!authReady) {
    return (
      <div className={cn('crm-mode min-h-screen bg-[var(--color-bg)]', mode)} />
    );
  }

  if (!authToken) {
    return (
      <div className={cn('crm-mode min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]', mode)}>
        <div className="flex min-h-screen items-center justify-center p-6">
          <form
            onSubmit={handleLogin}
            className="w-full max-w-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-sm"
          >
            <div className="mb-5">
              <h1 className="font-sora text-xl font-bold text-[var(--color-text-primary)]">Admin Rancho</h1>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Entre para acessar o painel operacional.</p>
            </div>
            <div className="space-y-3">
              <input
                value={loginForm.username}
                onChange={(event) => setLoginForm((state) => ({ ...state, username: event.target.value }))}
                placeholder="Usuário"
                autoComplete="username"
                className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm outline-none focus:border-[var(--color-accent)]"
              />
              <input
                value={loginForm.password}
                onChange={(event) => setLoginForm((state) => ({ ...state, password: event.target.value }))}
                placeholder="Senha"
                type="password"
                autoComplete="current-password"
                className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="mt-4 h-10 w-full rounded-md bg-[var(--color-accent)] px-3 text-sm font-semibold text-[var(--color-text-on-accent)] disabled:opacity-60"
            >
              {loginLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('crm-mode min-h-screen flex', mode)}>
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col flex-shrink-0 min-h-screen">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-[var(--color-border)]">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-brand text-xl font-black uppercase text-[var(--color-accent)]">Rancho</span>
            <span className="font-brand text-xl font-black uppercase text-[var(--color-text-primary)]">Comida Caseira</span>
          </Link>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 font-semibold uppercase tracking-wider">Painel Admin</p>
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${whatsConnected ? 'bg-[var(--color-success)]' : 'bg-[var(--color-danger)]'}`}
            />
            <span className="text-xs text-[var(--color-text-secondary)]">
              WhatsApp {whatsConnected ? 'conectado' : 'desconectado'}
            </span>
          </div>
          {!whatsConnected && (
            <button
              type="button"
              onClick={() => void prepararConexaoWhatsApp()}
              className="mt-3 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
            >
              {whatsLoading ? 'Conectando...' : 'Conectar WhatsApp'}
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname?.startsWith(item.href) ?? false;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={toggleMode}
            className="mb-3 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
          >
            {mode === 'dark-mode' ? 'Modo Claro' : 'Modo Escuro'}
          </button>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
            Ver site
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-[var(--color-bg)] text-[var(--color-text-primary)]">
        {children}
      </main>

      {showWhatsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="mb-2 text-lg font-bold">Conectar WhatsApp</div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Instância: <span className="font-semibold text-[var(--color-text-primary)]">{whatsInstanceName || '-'}</span>
            </p>
            <div className="mt-4 flex items-center justify-center rounded-md border border-[var(--color-border)] bg-white p-3">
              {whatsQrCode ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={whatsQrCode} alt="QR Code do WhatsApp" className="h-64 w-64" />
              ) : (
                <span className="text-sm text-[var(--color-text-secondary)]">Sem QR no momento. Atualize.</span>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void atualizarQrCode()}
                className="flex-1 rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-[var(--color-text-on-accent)]"
              >
                {whatsLoading ? 'Atualizando...' : 'Atualizar QR'}
              </button>
              <button
                type="button"
                onClick={() => setShowWhatsModal(false)}
                className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
