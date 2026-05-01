'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { AdminMetricas, LojaStatusAdmin } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { formatCurrency, formatTime } from '@/lib/utils';

function statusLabel(status: string) {
  return status.replace('_', ' ').toLowerCase();
}

export default function AdminDashboardPage() {
  const { showError } = useToast();
  const [metricas, setMetricas] = useState<AdminMetricas | null>(null);
  const [lojaStatus, setLojaStatus] = useState<LojaStatusAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  const carregarDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [metricasData, lojaData] = await Promise.all([
        api.adminPedidos.obterMetricas(),
        api.adminPedidos.obterStatusLoja(),
      ]);
      setMetricas(metricasData);
      setLojaStatus(lojaData);
    } catch (err) {
      showError('Falha ao carregar dashboard', err instanceof Error ? err.message : 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void carregarDashboard();
  }, [carregarDashboard]);

  const statusItems = useMemo(() => {
    const entries = Object.entries(metricas?.porStatus || {});
    return entries.filter(([, total]) => total > 0);
  }, [metricas?.porStatus]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-[var(--color-text-secondary)]">Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Atualizado {metricas?.atualizadoEm ? formatTime(metricas.atualizadoEm) : '-'}
          </p>
        </div>
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2 text-sm">
          <span className="text-[var(--color-text-secondary)]">Loja: </span>
          <span className="font-semibold text-[var(--color-text-primary)]">{lojaStatus?.status || '-'}</span>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Pedidos hoje</p>
          <p className="mt-2 font-sora text-2xl font-bold text-[var(--color-text-primary)]">{metricas?.pedidosHoje ?? 0}</p>
        </div>
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Receita hoje</p>
          <p className="mt-2 font-sora text-2xl font-bold text-[var(--color-success-text)]">{formatCurrency(metricas?.receitaDia ?? 0)}</p>
        </div>
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Mensagens não lidas</p>
          <p className="mt-2 font-sora text-2xl font-bold text-[var(--color-warning-text)]">{metricas?.mensagensNaoLidas ?? 0}</p>
        </div>
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Em rota</p>
          <p className="mt-2 font-sora text-2xl font-bold text-[var(--color-info-text)]">{metricas?.emRota ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
          <h2 className="mb-3 font-sora text-lg font-bold text-[var(--color-text-primary)]">Pedidos por status</h2>
          {statusItems.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Sem pedidos contabilizados no momento.</p>
          ) : (
            <div className="space-y-2">
              {statusItems.map(([status, total]) => (
                <div key={status} className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{statusLabel(status)}</span>
                  <span className="font-mono-crm text-sm text-[var(--color-text-secondary)]">{total}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
          <h2 className="mb-3 font-sora text-lg font-bold text-[var(--color-text-primary)]">Operação agora</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Pagamento pendente</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{metricas?.aguardandoPagamento ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Aguardando aprovação</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{metricas?.aguardandoAprovacao ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Em preparo</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{metricas?.emPreparo ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Entregues</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{metricas?.entregues ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-secondary)]">Cancelados</span>
              <span className="font-semibold text-[var(--color-text-primary)]">{metricas?.cancelados ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
