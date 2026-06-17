'use client';

import { FormEvent, useState } from 'react';

const campoStyle: React.CSSProperties = {
  background: 'var(--color-surface-input)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text-primary)',
};

export default function LeadForm({ id = 'lead' }: { id?: string }) {
  const [form, setForm] = useState({ nome: '', restaurante: '', contato: '' });
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'erro'>('idle');
  const [erro, setErro] = useState('');

  const enviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEstado('enviando');
    setErro('');
    try {
      const resp = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!resp.ok) {
        const b = await resp.json().catch(() => null);
        throw new Error(b?.error?.message || 'Não foi possível enviar agora.');
      }
      setEstado('ok');
    } catch (err) {
      setEstado('erro');
      setErro(err instanceof Error ? err.message : 'Erro ao enviar.');
    }
  };

  if (estado === 'ok') {
    return (
      <div
        className="rounded-2xl border p-6 text-center"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: 'var(--color-success-muted)', color: 'var(--color-success-text)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <p className="text-lg font-bold">Recebemos seu contato! 🎉</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Em breve a gente fala com você pra liberar seu acesso.
        </p>
      </div>
    );
  }

  return (
    <form
      id={id}
      onSubmit={enviar}
      className="rounded-2xl border p-6"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <p className="mb-4 text-sm font-semibold">Comece grátis — deixe seu contato</p>
      <div className="space-y-3">
        <div>
          <label htmlFor={`${id}-nome`} className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Seu nome
          </label>
          <input
            id={`${id}-nome`}
            required
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-[var(--color-border-focus)]"
            style={campoStyle}
            placeholder="Maria Silva"
          />
        </div>
        <div>
          <label htmlFor={`${id}-rest`} className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Nome do restaurante
          </label>
          <input
            id={`${id}-rest`}
            required
            value={form.restaurante}
            onChange={(e) => setForm((f) => ({ ...f, restaurante: e.target.value }))}
            className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-[var(--color-border-focus)]"
            style={campoStyle}
            placeholder="Cantina da Praça"
          />
        </div>
        <div>
          <label htmlFor={`${id}-contato`} className="mb-1 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            WhatsApp ou e-mail
          </label>
          <input
            id={`${id}-contato`}
            required
            value={form.contato}
            onChange={(e) => setForm((f) => ({ ...f, contato: e.target.value }))}
            className="w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-[var(--color-border-focus)]"
            style={campoStyle}
            placeholder="(62) 99999-9999"
          />
        </div>
      </div>

      {estado === 'erro' && (
        <p className="mt-3 text-sm" style={{ color: 'var(--color-danger-text)' }} role="alert">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={estado === 'enviando'}
        className="mt-5 w-full rounded-full px-5 py-3 text-sm font-bold transition disabled:opacity-60"
        style={{ background: 'var(--color-accent)', color: 'var(--color-text-on-accent)' }}
      >
        {estado === 'enviando' ? 'Enviando…' : 'Quero a AURA vendendo por mim'}
      </button>
      <p className="mt-3 text-center text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        Sem cartão. Sem compromisso.
      </p>
    </form>
  );
}
