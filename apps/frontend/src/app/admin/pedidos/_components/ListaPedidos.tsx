'use client';

import React from 'react';
import { AdminPedidoListaItem } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { CrmBadge, CrmButton, CrmCard, CrmTimer } from '@/components/crm';
import { paymentIcon, slaByStatus, toBadgeVariant } from './_utils';

interface Props {
  pedidos: AdminPedidoListaItem[];
  loading: boolean;
  modoPico: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConfirmar: (id: string) => void;
  page: number;
  totalPedidos: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function ListaPedidos({
  pedidos,
  loading,
  modoPico,
  selectedId,
  onSelect,
  onConfirmar,
  page,
  totalPedidos,
  pageSize,
  onPageChange,
}: Props) {
  return (
    <CrmCard className={`flex flex-col p-3 ${modoPico ? 'max-h-[80vh] min-h-[80vh]' : 'max-h-[72vh] min-h-[72vh]'}`}>
      <div className="flex-1 overflow-auto">
        {loading ? (
          <p className="p-3 text-sm text-[var(--color-text-secondary)]">Carregando pedidos...</p>
        ) : pedidos.length === 0 ? (
          <p className="p-3 text-sm text-[var(--color-text-secondary)]">Sem pedidos para os filtros atuais.</p>
        ) : (
          <div className={`space-y-2 ${modoPico ? 'space-y-3' : ''}`}>
            {pedidos.map((pedido) => {
              const sla = slaByStatus(pedido.status);
              return (
                <button
                  key={pedido.id}
                  type="button"
                  onClick={() => onSelect(pedido.id)}
                  className={`w-full rounded-md border text-left transition-colors ${modoPico ? 'p-4' : 'p-3'} ${
                    selectedId === pedido.id
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-muted)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className={`font-mono-crm font-semibold text-[var(--color-text-secondary)] ${modoPico ? 'text-sm' : 'text-xs'}`}>#{pedido.numero}</span>
                    <CrmTimer elapsedSeconds={pedido.tempoNoEstagio} warningAt={sla.warningAt} dangerAt={sla.dangerAt} blinkOnDanger />
                  </div>
                  <p className={`truncate font-semibold text-[var(--color-text-primary)] ${modoPico ? 'text-base' : 'text-sm'}`}>{pedido.clienteNome}</p>
                  {!modoPico && <p className="truncate text-xs text-[var(--color-text-secondary)]">{pedido.bairro}</p>}
                  <p className={`mt-1 truncate text-[var(--color-text-tertiary)] ${modoPico ? 'text-sm' : 'text-xs'}`}>{pedido.itensResumo.join(' + ')}</p>
                  <p className={`mt-1 truncate text-[var(--color-text-tertiary)] ${modoPico ? 'text-xs' : 'text-[11px]'}`}>
                    {(pedido.formaPagamento || 'PIX').replace('_', ' ')} · {(pedido.tipoAtendimento || 'ENTREGA').replace('_', ' ')}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <CrmBadge variant={pedido.statusPagamento === 'CONFIRMADO' ? 'paid' : pedido.statusPagamento === 'EXPIRADO' ? 'expired' : 'unpaid'}>
                      {paymentIcon(pedido.statusPagamento)} {pedido.statusPagamento}
                    </CrmBadge>
                    <span className="text-sm font-semibold text-[var(--color-accent)]">{formatCurrency(pedido.total)}</span>
                  </div>
                  {pedido.aguardandoEntregador && (
                    <div className="mt-2"><CrmBadge variant="waiting">Aguardando entregador</CrmBadge></div>
                  )}
                  {pedido.mensagensNaoLidas > 0 && (
                    <div className="mt-2"><CrmBadge variant="waiting">{pedido.mensagensNaoLidas} msg</CrmBadge></div>
                  )}
                  <div className="mt-2">
                    <CrmButton
                      size="sm"
                      className="w-full"
                      disabled={!['CONFIRMADO', 'A_RECEBER'].includes(pedido.statusPagamento) || pedido.status !== 'AGUARDANDO_PAGAMENTO'}
                      title={!['CONFIRMADO', 'A_RECEBER'].includes(pedido.statusPagamento) ? 'Aguardando pagamento' : 'Confirmar pedido'}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onConfirmar(pedido.id);
                      }}
                    >
                      Confirmar
                    </CrmButton>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
        <p className="text-xs text-[var(--color-text-secondary)]">
          Página {page} · {pedidos.length} de {totalPedidos}
        </p>
        <div className="flex gap-2">
          <CrmButton size="sm" variant="ghost" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
            Anterior
          </CrmButton>
          <CrmButton size="sm" variant="ghost" disabled={page * pageSize >= totalPedidos} onClick={() => onPageChange(page + 1)}>
            Próxima
          </CrmButton>
        </div>
      </div>
    </CrmCard>
  );
}
