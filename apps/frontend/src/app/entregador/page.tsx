'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function EntregadorLoginPage() {
  const router = useRouter();
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('rancho:entregador:token');
    if (token) router.replace('/entregador/fila');
  }, [router]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/entregador/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: telefone.replace(/\D/g, '') }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErro(json.error?.message ?? 'Erro ao fazer login');
        return;
      }
      localStorage.setItem('rancho:entregador:token', json.data.token);
      localStorage.setItem('rancho:entregador:nome', json.data.entregador.nome);
      router.replace('/entregador/fila');
    } catch {
      setErro('Sem conexão com o servidor');
    } finally {
      setLoading(false);
    }
  }

  function formatarTelefone(value: string) {
    const nums = value.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 2) return nums;
    if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-3xl">
            🛵
          </div>
          <h1 className="text-2xl font-bold">Rancho Entregador</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Entre com seu número de telefone cadastrado
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">
              Telefone
            </label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
              placeholder="(62) 99999-9999"
              inputMode="numeric"
              autoComplete="tel"
              className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-base outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
              required
            />
          </div>

          {erro && (
            <div className="rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger-muted)] px-3 py-2 text-sm text-[var(--color-danger-text)]">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || telefone.replace(/\D/g, '').length < 8}
            className="h-12 w-full rounded-xl bg-[var(--color-accent)] text-base font-semibold text-white disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
