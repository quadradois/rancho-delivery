'use client';

import { useCallback, useEffect, useState } from 'react';
import { superadminApi, type RestauranteResumo, type EstadoConta } from '@/lib/superadmin-client';
import { useToast } from '@/contexts/ToastContext';

const ESTADO_COR: Record<EstadoConta, string> = {
  ATIVA: 'var(--color-success)',
  TESTE: 'var(--color-info)',
  INADIMPLENTE: 'var(--color-warning)',
  CANCELADA: 'var(--color-danger)',
};

function Badge({ texto, cor }: { texto: string; cor: string }) {
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ color: cor, background: 'color-mix(in srgb, ' + cor + ' 15%, transparent)' }}
    >
      {texto}
    </span>
  );
}

export default function RestaurantesPage() {
  const { showError } = useToast();
  const [restaurantes, setRestaurantes] = useState<RestauranteResumo[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      setRestaurantes(await superadminApi.listarRestaurantes());
    } catch (err) {
      showError('Falha ao carregar restaurantes', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Restaurantes</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {loading ? 'Carregando…' : `${restaurantes.length} restaurante(s) na plataforma`}
        </p>
      </header>

      {!loading && restaurantes.length === 0 && (
        <div
          className="rounded-xl border p-10 text-center text-sm"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
        >
          Nenhum restaurante cadastrado ainda.
        </div>
      )}

      <div className="grid gap-3">
        {restaurantes.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-xl border p-4"
            style={{ background: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{r.nome}</span>
                {!r.ativo && <Badge texto="suspenso" cor="var(--color-danger)" />}
              </div>
              <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                {r.slug}
                {r.dominio ? ` · ${r.dominio}` : ''}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {r.assinatura ? (
                <>
                  {r.assinatura.plano && <Badge texto={r.assinatura.plano} cor="var(--color-accent)" />}
                  <Badge texto={r.assinatura.estado} cor={ESTADO_COR[r.assinatura.estado]} />
                </>
              ) : (
                <Badge texto="Grátis" cor="var(--color-text-secondary)" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
