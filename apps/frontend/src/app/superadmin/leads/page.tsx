'use client';

import { useCallback, useEffect, useState } from 'react';
import { superadminApi, type Lead } from '@/lib/superadmin-client';
import { useToast } from '@/contexts/ToastContext';
import { Card } from '../components/ui';

function quando(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function LeadsPage() {
  const { showError } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setLeads(await superadminApi.listarLeads());
    } catch (err) {
      showError('Falha ao carregar leads', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="w-full">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {loading ? 'Carregando…' : `${leads.length} contato(s) vindos do site`}
        </p>
      </header>

      {!loading && leads.length === 0 && (
        <div className="rounded-xl border p-10 text-center text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
          Nenhum lead ainda. Quando alguém preencher o formulário do site, aparece aqui.
        </div>
      )}

      <div className="grid gap-3">
        {leads.map((l) => (
          <Card key={l.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{l.nome}</span>
                  <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>· {l.restaurante}</span>
                </div>
                <a
                  href={l.contato.includes('@') ? `mailto:${l.contato}` : undefined}
                  className="mt-0.5 block text-sm"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {l.contato}
                </a>
                {l.mensagem && (
                  <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{l.mensagem}</p>
                )}
              </div>
              <span className="shrink-0 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{quando(l.criadoEm)}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
