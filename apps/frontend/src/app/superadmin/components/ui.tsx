'use client';

import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { EstadoConta } from '@/lib/superadmin-client';

export const ESTADO_COR: Record<EstadoConta, string> = {
  ATIVA: 'var(--color-success)',
  TESTE: 'var(--color-info)',
  INADIMPLENTE: 'var(--color-warning)',
  CANCELADA: 'var(--color-danger)',
};

export const ESTADOS: EstadoConta[] = ['TESTE', 'ATIVA', 'INADIMPLENTE', 'CANCELADA'];

export function Badge({ texto, cor }: { texto: string; cor: string }) {
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ color: cor, background: `color-mix(in srgb, ${cor} 15%, transparent)` }}
    >
      {texto}
    </span>
  );
}

type BtnVariant = 'primary' | 'ghost' | 'danger';
const BTN_STYLE: Record<BtnVariant, React.CSSProperties> = {
  primary: { background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' },
  ghost: { background: 'transparent', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-strong)' },
  danger: { background: 'var(--color-danger-muted)', color: 'var(--color-danger-text)' },
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  return (
    <button
      {...props}
      className={`rounded-full px-4 py-2 text-sm font-bold transition disabled:opacity-60 ${className}`}
      style={BTN_STYLE[variant]}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const fieldStyle: React.CSSProperties = {
  background: 'var(--color-surface-input)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
};

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--color-border-focus)]"
      style={fieldStyle}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--color-border-focus)]"
      style={fieldStyle}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border p-5 ${className}`}
      style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
    >
      {children}
    </div>
  );
}

/**
 * Drawer lateral (direita) — PADRÃO do projeto no lugar de modal.
 * Fecha no scrim e no Esc; desliza da direita (respeita reduced-motion).
 * `footer` fica fixo embaixo (ações como Salvar/Cancelar).
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l shadow-2xl"
            style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
            role="dialog"
            aria-modal="true"
            initial={reduce ? { opacity: 0 } : { x: '100%' }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-lg font-bold">{title}</h2>
              <button onClick={onClose} aria-label="Fechar" className="rounded-lg p-1 transition hover:opacity-70" style={{ color: 'var(--color-text-secondary)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </header>
            <div className="flex-1 overflow-auto px-6 py-5">{children}</div>
            {footer && (
              <div className="flex justify-end gap-2 border-t px-6 py-4" style={{ borderColor: 'var(--color-border)' }}>
                {footer}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
