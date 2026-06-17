'use client';

import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
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
