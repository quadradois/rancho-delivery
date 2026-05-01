'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api, { AdminDecisaoItem, StatusAlerta } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import useCockpitSocket from '@/hooks/useCockpitSocket';
import CrmBadge, { CrmBadgeVariant } from '@/components/crm/CrmBadge';
import CrmButton from '@/components/crm/CrmButton';
import CrmCard from '@/components/crm/CrmCard';

const STATUS_FILTROS: Array<{ value?: StatusAlerta; label: string }> = [
  { value: undefined, label: 'Abertas' },
  { value: 'EM_TRATAMENTO', label: 'Em tratamento' },
  { value: 'RESOLVIDO', label: 'Resolvidas' },
  { value: 'IGNORADO', label: 'Ignoradas' },
];

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}min`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function severityLabel(severidade: AdminDecisaoItem['severidade']) {
  const labels = {
    CRITICO: 'Critico',
    ATENCAO: 'Atencao',
    INFO: 'Info',
  };
  return labels[severidade];
}

function severityVariant(severidade: AdminDecisaoItem['severidade']): CrmBadgeVariant {
  if (severidade === 'CRITICO') return 'cancelled';
  if (severidade === 'ATENCAO') return 'waiting';
  return 'delivered';
}

function actionLabel(acao: AdminDecisaoItem['proximaAcao']) {
  const labels: Record<AdminDecisaoItem['proximaAcao'], string> = {
    CONFIRMAR_PEDIDO: 'Confirmar pedido',
    RESPONDER_CLIENTE: 'Responder cliente',
    VERIFICAR_COZINHA: 'Verificar cozinha',
    ATRIBUIR_ENTREGADOR: 'Atribuir entregador',
    MARCAR_ESTORNO: 'Marcar estorno',
    RECONECTAR_WHATSAPP: 'Reconectar WhatsApp',
    REVISAR_ENDERECO: 'Revisar endereco',
    ACOMPANHAR: 'Acompanhar',
  };
  return labels[acao];
}

function typeLabel(tipo: AdminDecisaoItem['tipo']) {
  const labels: Record<AdminDecisaoItem['tipo'], string> = {
    PEDIDO_PAGO_SEM_CONFIRMACAO: 'Pagamento confirmado',
    CLIENTE_SEM_RESPOSTA: 'Cliente sem resposta',
    PREPARO_ATRASADO: 'Preparo atrasado',
    PEDIDO_SEM_ENTREGADOR: 'Sem entregador',
    ESTORNO_NECESSARIO: 'Estorno pendente',
    WHATSAPP_INDISPONIVEL: 'WhatsApp indisponivel',
    FALHA_ENVIO_WHATSAPP: 'Falha WhatsApp',
    ENDERECO_DUVIDOSO: 'Endereco duvidoso',
  };
  return labels[tipo];
}

export default function AdminDecisoesPage() {
  const { showSuccess, showError } = useToast();
  const [decisoes, setDecisoes] = useState<AdminDecisaoItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<StatusAlerta | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [metricas, setMetricas] = useState({
    abertos: 0,
    criticos: 0,
    atencao: 0,
    clientesSemResposta: 0,
    pagosSemConfirmacao: 0,
    preparoAtrasado: 0,
    estornosPendentes: 0,
  });

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const [lista, dadosMetricas] = await Promise.all([
        api.adminDecisoes.listar({ status: statusFiltro, busca, limit: 50 }),
        api.adminDecisoes.obterMetricas(),
      ]);
      setDecisoes(lista.items);
      setMetricas(dadosMetricas);
      setSelectedId((atual) => {
        if (atual && lista.items.some((item) => item.id === atual)) return atual;
        return lista.items[0]?.id || null;
      });
    } catch (error) {
      showError('Erro ao carregar decisoes', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [busca, statusFiltro, showError]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useCockpitSocket({
    onDecisaoNova: carregar,
    onDecisaoAtualizada: carregar,
    onDecisaoResolvida: carregar,
    onPedidoAtualizado: carregar,
    onMensagemNova: carregar,
    onFallbackPoll: carregar,
    fallbackIntervalMs: 10000,
  });

  const selected = useMemo(
    () => decisoes.find((item) => item.id === selectedId) || null,
    [decisoes, selectedId]
  );

  const executarAcao = async (decisao: AdminDecisaoItem) => {
    setActingId(decisao.id);
    try {
      if (decisao.proximaAcao === 'CONFIRMAR_PEDIDO' && decisao.pedido) {
        await api.adminPedidos.atualizarStatus(decisao.pedido.id, 'CONFIRMADO');
        await api.adminDecisoes.resolver(decisao.id, 'RESOLVIDO', 'Pedido confirmado pela Central de Decisoes');
        showSuccess('Pedido confirmado');
      } else if (decisao.proximaAcao === 'MARCAR_ESTORNO' && decisao.pedido) {
        await api.adminPedidos.marcarEstorno(decisao.pedido.id);
        await api.adminDecisoes.resolver(decisao.id, 'RESOLVIDO', 'Estorno marcado pela Central de Decisoes');
        showSuccess('Estorno marcado');
      } else {
        await api.adminDecisoes.atualizarStatus(decisao.id, 'EM_TRATAMENTO');
        showSuccess('Decisao marcada em tratamento');
      }

      await carregar();
    } catch (error) {
      showError('Erro ao executar acao', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setActingId(null);
    }
  };

  const resolver = async (decisao: AdminDecisaoItem) => {
    setActingId(decisao.id);
    try {
      await api.adminDecisoes.resolver(decisao.id, 'RESOLVIDO', 'Resolvido manualmente pela Central de Decisoes');
      showSuccess('Decisao resolvida');
      await carregar();
    } catch (error) {
      showError('Erro ao resolver decisao', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setActingId(null);
    }
  };

  const ignorar = async (decisao: AdminDecisaoItem) => {
    const motivo = window.prompt('Informe o motivo para ignorar esta decisao');
    if (!motivo?.trim()) return;

    setActingId(decisao.id);
    try {
      await api.adminDecisoes.resolver(decisao.id, 'IGNORADO', motivo.trim());
      showSuccess('Decisao ignorada');
      await carregar();
    } catch (error) {
      showError('Erro ao ignorar decisao', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setActingId(null);
    }
  };

  const recalcular = async () => {
    try {
      await api.adminDecisoes.recalcular({ escopo: 'ABERTOS' });
      await carregar();
      showSuccess('Fila recalculada');
    } catch (error) {
      showError('Erro ao recalcular fila', error instanceof Error ? error.message : 'Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-sora text-3xl font-bold uppercase text-[var(--color-text-primary)]">Central de Decisoes</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Fila operacional para pedidos, clientes e riscos que exigem atencao agora.
          </p>
        </div>
        <div className="flex gap-2">
          <CrmButton variant="ghost" onClick={() => void recalcular()}>
            Recalcular
          </CrmButton>
          <Link href="/admin/pedidos">
            <CrmButton variant="ghost">Cockpit pedidos</CrmButton>
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <CrmCard className="p-3">
          <p className="text-xs font-semibold uppercase text-[var(--color-text-tertiary)]">Abertas</p>
          <p className="mt-1 font-sora text-2xl font-bold text-[var(--color-text-primary)]">{metricas.abertos}</p>
        </CrmCard>
        <CrmCard className="border-[var(--color-danger)] bg-[var(--color-danger-muted)] p-3">
          <p className="text-xs font-semibold uppercase text-[var(--color-danger-text)]">Criticas</p>
          <p className="mt-1 font-sora text-2xl font-bold text-[var(--color-danger-text)]">{metricas.criticos}</p>
        </CrmCard>
        <CrmCard className="border-[var(--color-warning)] bg-[var(--color-warning-muted)] p-3">
          <p className="text-xs font-semibold uppercase text-[var(--color-warning-text)]">Atencao</p>
          <p className="mt-1 font-sora text-2xl font-bold text-[var(--color-warning-text)]">{metricas.atencao}</p>
        </CrmCard>
        <CrmCard className="p-3">
          <p className="text-xs font-semibold uppercase text-[var(--color-text-tertiary)]">Sem resposta</p>
          <p className="mt-1 font-sora text-2xl font-bold text-[var(--color-text-primary)]">{metricas.clientesSemResposta}</p>
        </CrmCard>
        <CrmCard className="p-3">
          <p className="text-xs font-semibold uppercase text-[var(--color-text-tertiary)]">Estornos</p>
          <p className="mt-1 font-sora text-2xl font-bold text-[var(--color-text-primary)]">{metricas.estornosPendentes}</p>
        </CrmCard>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row">
        <input
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar decisao, cliente, telefone ou pedido..."
          className="h-10 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-input)] px-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] placeholder:opacity-90 outline-none focus:border-[var(--color-accent)]"
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTROS.map((filtro) => (
            <CrmButton
              key={filtro.label}
              variant={statusFiltro === filtro.value ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFiltro(filtro.value)}
            >
              {filtro.label}
            </CrmButton>
          ))}
        </div>
      </div>

      <div className="grid min-h-[68vh] grid-cols-1 gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
        <div className="max-h-[68vh] overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          {loading ? (
            <p className="p-3 text-sm text-[var(--color-text-secondary)]">Carregando fila...</p>
          ) : decisoes.length === 0 ? (
            <div className="p-6 text-sm text-[var(--color-text-secondary)]">
              Nenhuma decisao pendente para os filtros atuais.
            </div>
          ) : (
            <div className="space-y-2">
              {decisoes.map((decisao) => (
                <button
                  key={decisao.id}
                  type="button"
                  onClick={() => setSelectedId(decisao.id)}
                  className={`w-full rounded-md border p-3 text-left transition-colors ${
                    selectedId === decisao.id
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <CrmBadge variant={severityVariant(decisao.severidade)}>{severityLabel(decisao.severidade)}</CrmBadge>
                    <span className="font-mono-crm text-xs text-[var(--color-text-secondary)]">
                      {formatDuration(decisao.tempoPendenteSegundos)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{decisao.titulo}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--color-text-secondary)]">{decisao.motivo}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-[var(--color-text-tertiary)]">{typeLabel(decisao.tipo)}</span>
                    {decisao.pedido && (
                      <span className="font-mono-crm text-xs text-[var(--color-accent)]">#{decisao.pedido.numero}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <CrmCard className="min-h-[68vh] p-5">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-secondary)]">
              Selecione uma decisao para agir.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <CrmBadge variant={severityVariant(selected.severidade)}>{severityLabel(selected.severidade)}</CrmBadge>
                    <CrmBadge variant="delivered">{typeLabel(selected.tipo)}</CrmBadge>
                  </div>
                  <h2 className="font-sora text-2xl font-bold text-[var(--color-text-primary)]">{selected.titulo}</h2>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{selected.descricao}</p>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-xs uppercase text-[var(--color-text-tertiary)]">Detectado</p>
                  <p className="font-mono-crm text-sm text-[var(--color-text-secondary)]">{formatDateTime(selected.detectadoEm)}</p>
                </div>
              </div>

              <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
                <p className="text-xs font-semibold uppercase text-[var(--color-text-tertiary)]">Motivo</p>
                <p className="mt-2 text-sm text-[var(--color-text-primary)]">{selected.motivo}</p>
              </div>

              {selected.pedido && (
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
                    <p className="text-xs font-semibold uppercase text-[var(--color-text-tertiary)]">Pedido</p>
                    <p className="mt-2 font-sora text-lg font-bold text-[var(--color-text-primary)]">#{selected.pedido.numero}</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">{selected.pedido.clienteNome}</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">{selected.pedido.bairro || 'Bairro nao informado'}</p>
                  </div>
                  <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
                    <p className="text-xs font-semibold uppercase text-[var(--color-text-tertiary)]">Operacao</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <CrmBadge variant="pending">{selected.pedido.status}</CrmBadge>
                      <CrmBadge variant={selected.pedido.statusPagamento === 'CONFIRMADO' ? 'paid' : 'unpaid'}>
                        {selected.pedido.statusPagamento}
                      </CrmBadge>
                    </div>
                    <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                      {formatCurrency(selected.pedido.total)} · etapa ha {formatDuration(selected.pedido.tempoNoEstagio)}
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-md border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] p-4">
                <p className="text-xs font-semibold uppercase text-[var(--color-accent)]">Proxima acao</p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-text-primary)]">{actionLabel(selected.proximaAcao)}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <CrmButton
                  onClick={() => void executarAcao(selected)}
                  disabled={actingId === selected.id || selected.status === 'RESOLVIDO' || selected.status === 'IGNORADO'}
                >
                  {actingId === selected.id ? 'Executando...' : actionLabel(selected.proximaAcao)}
                </CrmButton>
                {selected.pedido && (
                  <Link href="/admin/pedidos">
                    <CrmButton variant="ghost">Abrir cockpit</CrmButton>
                  </Link>
                )}
                <CrmButton
                  variant="success"
                  onClick={() => void resolver(selected)}
                  disabled={actingId === selected.id || selected.status === 'RESOLVIDO' || selected.status === 'IGNORADO'}
                >
                  Resolver
                </CrmButton>
                <CrmButton
                  variant="danger"
                  onClick={() => void ignorar(selected)}
                  disabled={actingId === selected.id || selected.status === 'RESOLVIDO' || selected.status === 'IGNORADO'}
                >
                  Ignorar
                </CrmButton>
              </div>
            </div>
          )}
        </CrmCard>
      </div>
    </div>
  );
}
