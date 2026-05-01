'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { AdminPedidoDetalhe, AdminPedidoListaItem } from '@/lib/api';
import { formatCurrency, formatTime } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import useCockpitSocket from '@/hooks/useCockpitSocket';
import {
  CrmBadge,
  CrmButton,
  CrmCard,
  CrmInput,
  CrmTab,
  CrmTabList,
  CrmTabPanel,
  CrmTabTrigger,
  CrmTimer,
} from '@/components/crm';

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'AGUARDANDO_PAGAMENTO', label: 'Pag. Pendente' },
  { value: 'CONFIRMADO', label: 'Aprovação' },
  { value: 'PREPARANDO', label: 'Preparo' },
  { value: 'SAIU_ENTREGA', label: 'Em rota' },
  { value: 'ENTREGUE', label: 'Entregue' },
  { value: 'CANCELADO', label: 'Cancelado' },
];
const STATUS_FLOW = ['CONFIRMADO', 'PREPARANDO', 'SAIU_ENTREGA', 'ENTREGUE'] as const;

function toBadgeVariant(status: string) {
  switch (status) {
    case 'AGUARDANDO_PAGAMENTO':
    case 'PENDENTE':
      return 'pending' as const;
    case 'CONFIRMADO':
      return 'waiting' as const;
    case 'PREPARANDO':
      return 'preparing' as const;
    case 'SAIU_ENTREGA':
      return 'on-route' as const;
    case 'ENTREGUE':
      return 'delivered' as const;
    case 'CANCELADO':
      return 'cancelled' as const;
    case 'EXPIRADO':
    case 'ABANDONADO':
      return 'expired' as const;
    default:
      return 'unpaid' as const;
  }
}

function labelStatus(status: string) {
  switch (status) {
    case 'AGUARDANDO_PAGAMENTO':
      return 'Aguard. pagamento';
    case 'SAIU_ENTREGA':
      return 'Em rota';
    default:
      return status.replace('_', ' ').toLowerCase();
  }
}

function paymentIcon(statusPagamento: 'PENDENTE' | 'CONFIRMADO' | 'EXPIRADO') {
  if (statusPagamento === 'CONFIRMADO') return '🔒';
  if (statusPagamento === 'EXPIRADO') return '❌';
  return '⏳';
}

function slaByStatus(status: string) {
  switch (status) {
    case 'CONFIRMADO':
      return { warningAt: 180, dangerAt: 300 };
    case 'PREPARANDO':
      return { warningAt: 1500, dangerAt: 2100 };
    case 'SAIU_ENTREGA':
      return { warningAt: 3000, dangerAt: 3600 };
    default:
      return { warningAt: 300, dangerAt: 600 };
  }
}

export default function AdminPedidosPage() {
  const { showSuccess, showError } = useToast();
  const [pedidos, setPedidos] = useState<AdminPedidoListaItem[]>([]);
  const [pedidoDetalhe, setPedidoDetalhe] = useState<AdminPedidoDetalhe | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [busca, setBusca] = useState('');

  const carregarLista = useCallback(async () => {
    setLoadingList(true);
    try {
      const data = await api.adminPedidos.listar({
        status: statusFiltro !== 'todos' ? statusFiltro : undefined,
        busca: busca || undefined,
      });
      setPedidos(data);
      if (!selectedId && data[0]) setSelectedId(data[0].id);
    } finally {
      setLoadingList(false);
    }
  }, [statusFiltro, busca, selectedId]);

  const carregarDetalhe = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const data = await api.adminPedidos.buscarPorId(id);
      setPedidoDetalhe(data);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void carregarLista();
  }, [carregarLista]);

  useEffect(() => {
    if (selectedId) void carregarDetalhe(selectedId);
  }, [selectedId, carregarDetalhe]);

  useCockpitSocket({
    onPedidoNovo: () => {
      void carregarLista();
    },
    onPedidoAtualizado: (payload) => {
      void carregarLista();
      if (selectedId && payload?.id === selectedId) {
        void carregarDetalhe(selectedId);
      }
    },
  });

  const resumo = useMemo(
    () => ({
      total: pedidos.length,
      aprovacao: pedidos.filter((p) => p.status === 'CONFIRMADO').length,
      preparo: pedidos.filter((p) => p.status === 'PREPARANDO').length,
    }),
    [pedidos]
  );

  const temBebida = useMemo(() => {
    if (!pedidoDetalhe) return false;
    return pedidoDetalhe.itens.some((item) => (item.produto?.categoria || '').toUpperCase().includes('BEBIDA'));
  }, [pedidoDetalhe]);

  const avancarStatus = useCallback(async () => {
    if (!pedidoDetalhe || savingStatus) return;

    const atual = pedidoDetalhe.status;
    const idx = STATUS_FLOW.indexOf(atual as (typeof STATUS_FLOW)[number]);
    if (idx < 0 || idx === STATUS_FLOW.length - 1) return;

    const proximo = STATUS_FLOW[idx + 1];

    setSavingStatus(true);
    try {
      await api.adminPedidos.atualizarStatus(pedidoDetalhe.id, proximo);
      await Promise.all([carregarLista(), carregarDetalhe(pedidoDetalhe.id)]);
      showSuccess('Status atualizado', `Pedido #${pedidoDetalhe.numero} movido para ${labelStatus(proximo)}.`);
    } catch (error: any) {
      showError('Falha ao atualizar status', error?.message || 'Tente novamente.');
    } finally {
      setSavingStatus(false);
    }
  }, [pedidoDetalhe, savingStatus, carregarLista, carregarDetalhe, showSuccess, showError]);

  return (
    <div className="p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">Cockpit de Pedidos</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {resumo.total} pedidos · {resumo.aprovacao} aguardando aprovação · {resumo.preparo} em preparo
          </p>
        </div>
        <CrmButton variant="ghost" onClick={() => void carregarLista()}>
          Atualizar
        </CrmButton>
      </div>

      <div className="mb-4 flex flex-col gap-3 md:flex-row">
        <div className="md:w-80">
          <CrmInput
            placeholder="Buscar cliente, telefone ou ID..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <CrmButton
              key={opt.value}
              variant={statusFiltro === opt.value ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFiltro(opt.value)}
            >
              {opt.label}
            </CrmButton>
          ))}
        </div>
      </div>

      <div className="grid min-h-[72vh] grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <CrmCard className="max-h-[72vh] overflow-auto p-3">
          {loadingList ? (
            <p className="p-3 text-sm text-[var(--color-text-secondary)]">Carregando pedidos...</p>
          ) : pedidos.length === 0 ? (
            <p className="p-3 text-sm text-[var(--color-text-secondary)]">Sem pedidos para os filtros atuais.</p>
          ) : (
            <div className="space-y-2">
              {pedidos.map((pedido) => (
                (() => {
                  const sla = slaByStatus(pedido.status);
                  return (
                <button
                  key={pedido.id}
                  type="button"
                  onClick={() => setSelectedId(pedido.id)}
                  className={`w-full rounded-md border p-3 text-left transition-colors ${
                    selectedId === pedido.id
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-mono-crm text-xs font-semibold text-[var(--color-text-secondary)]">#{pedido.numero}</span>
                    <CrmTimer
                      elapsedSeconds={pedido.tempoNoEstagio}
                      warningAt={sla.warningAt}
                      dangerAt={sla.dangerAt}
                      blinkOnDanger
                    />
                  </div>
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{pedido.clienteNome}</p>
                  <p className="truncate text-xs text-[var(--color-text-secondary)]">{pedido.bairro}</p>
                  <p className="mt-1 truncate text-xs text-[var(--color-text-tertiary)]">{pedido.itensResumo.join(' + ')}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <CrmBadge variant={pedido.statusPagamento === 'CONFIRMADO' ? 'paid' : pedido.statusPagamento === 'EXPIRADO' ? 'expired' : 'unpaid'}>
                      {paymentIcon(pedido.statusPagamento)} {pedido.statusPagamento}
                    </CrmBadge>
                    <span className="text-sm font-semibold text-[var(--color-accent)]">{formatCurrency(pedido.total)}</span>
                  </div>
                  <div className="mt-2">
                    <CrmButton
                      size="sm"
                      className="w-full"
                      disabled={pedido.statusPagamento !== 'CONFIRMADO'}
                      title={pedido.statusPagamento !== 'CONFIRMADO' ? 'Aguardando pagamento' : 'Confirmar pedido'}
                    >
                      Confirmar
                    </CrmButton>
                  </div>
                </button>
                  );
                })()
              ))}
            </div>
          )}
        </CrmCard>

        <CrmCard className="p-5">
          {!selectedId ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Selecione um pedido.</p>
          ) : loadingDetail || !pedidoDetalhe ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Carregando detalhes...</p>
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="font-sora text-xl font-bold text-[var(--color-text-primary)]">
                    Pedido #{pedidoDetalhe.numero}
                  </h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {pedidoDetalhe.cliente.nome} · {pedidoDetalhe.cliente.telefone}
                  </p>
                </div>
                <CrmBadge variant={toBadgeVariant(pedidoDetalhe.status)}>{labelStatus(pedidoDetalhe.status)}</CrmBadge>
              </div>

              <CrmTab defaultValue="pedido">
                <CrmTabList>
                  <CrmTabTrigger value="pedido">Pedido</CrmTabTrigger>
                  <CrmTabTrigger value="timeline">Timeline</CrmTabTrigger>
                </CrmTabList>

                <CrmTabPanel value="pedido">
                  <div className="space-y-4">
                    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                      <p className="mb-2 text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Fluxo de status</p>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {STATUS_FLOW.map((status) => (
                          <CrmBadge key={status} variant={toBadgeVariant(status)}>
                            {labelStatus(status)}
                          </CrmBadge>
                        ))}
                      </div>
                      <CrmButton
                        size="sm"
                        onClick={() => void avancarStatus()}
                        disabled={savingStatus || !STATUS_FLOW.includes(pedidoDetalhe.status as (typeof STATUS_FLOW)[number]) || pedidoDetalhe.status === 'ENTREGUE'}
                      >
                        {savingStatus ? 'Atualizando...' : 'Avançar status'}
                      </CrmButton>
                    </div>
                    {temBebida && (
                      <div className="rounded-md border border-[var(--color-warning)] bg-[var(--color-warning-muted)] p-3">
                        <p className="text-sm font-semibold text-[var(--color-warning-text)]">Não esqueça as bebidas</p>
                      </div>
                    )}
                    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                      <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Pagamento</p>
                      <p className="text-sm text-[var(--color-text-primary)]">{pedidoDetalhe.statusPagamento}</p>
                    </div>
                    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                      <label className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
                        <span>Imprimir comanda (em breve)</span>
                        <input type="checkbox" disabled className="h-4 w-4 cursor-not-allowed accent-[var(--color-accent)]" />
                      </label>
                    </div>
                    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                      <p className="text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Endereço</p>
                      <p className="text-sm text-[var(--color-text-primary)]">
                        {pedidoDetalhe.cliente.endereco} · {pedidoDetalhe.cliente.bairro}
                      </p>
                    </div>
                    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                      <p className="mb-2 text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Itens</p>
                      <div className="space-y-1">
                        {pedidoDetalhe.itens.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span className="text-[var(--color-text-primary)]">
                              {item.quantidade}x {item.produto?.nome || 'Produto'}
                            </span>
                            <span className="text-[var(--color-text-secondary)]">{formatCurrency(item.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 border-t border-[var(--color-border)] pt-2">
                        <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
                          <span>Subtotal</span>
                          <span>{formatCurrency(pedidoDetalhe.subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
                          <span>Entrega</span>
                          <span>{formatCurrency(pedidoDetalhe.taxaEntrega)}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-sm font-semibold text-[var(--color-text-primary)]">
                          <span>Total</span>
                          <span>{formatCurrency(pedidoDetalhe.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CrmTabPanel>

                <CrmTabPanel value="timeline">
                  <div className="space-y-2">
                    {pedidoDetalhe.timeline.map((item, index) => (
                      <div key={`${item.timestamp}-${index}`} className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3">
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          {formatTime(item.timestamp)} · {item.ator}
                        </p>
                        <p className="text-sm text-[var(--color-text-primary)]">{item.acao}</p>
                      </div>
                    ))}
                  </div>
                </CrmTabPanel>
              </CrmTab>
            </>
          )}
        </CrmCard>
      </div>
    </div>
  );
}
