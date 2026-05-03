import React from 'react';
import { AdminPedidoDetalhe } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Props {
  pedido: AdminPedidoDetalhe;
}

export function PedidoTicket({ pedido }: Props) {
  return (
    <div className="print-ticket rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-3" data-testid="print-ticket">
      <div className="mb-3 print:block">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">Pedido #{pedido.numero}</p>
        <p className="text-xs text-[var(--color-text-secondary)]">{new Date(pedido.createdAt).toLocaleString('pt-BR')}</p>
      </div>
      <div className="mb-3 space-y-1 text-sm">
        <p className="text-[var(--color-text-primary)]"><strong>Cliente:</strong> {pedido.cliente?.nome}</p>
        <p className="text-[var(--color-text-primary)]"><strong>Telefone:</strong> {pedido.cliente?.telefone}</p>
        <p className="text-[var(--color-text-primary)]"><strong>Endereço:</strong> {pedido.cliente?.endereco} · {pedido.cliente?.bairro}</p>
        <p className="text-[var(--color-text-primary)]"><strong>Pagamento:</strong> {(pedido.formaPagamento || 'PIX').replace('_', ' ')}</p>
        {pedido.trocoPara !== null && pedido.trocoPara !== undefined && (
          <p className="text-[var(--color-text-primary)]"><strong>Troco para:</strong> {formatCurrency(Number(pedido.trocoPara))}</p>
        )}
      </div>
      <p className="mb-2 text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">Itens</p>
      <div className="space-y-1">
        {pedido.itens.map((item) => (
          <div key={item.id} className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-primary)]">{item.quantidade}x {item.produto?.nome || 'Produto'}</span>
              <span className="text-[var(--color-text-secondary)]">{formatCurrency(item.subtotal)}</span>
            </div>
            {item.observacao && (
              <p className="mt-1 text-xs text-[var(--color-warning-text)]">Obs item: {item.observacao}</p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-[var(--color-border)] pt-2">
        <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]"><span>Subtotal</span><span>{formatCurrency(pedido.subtotal)}</span></div>
        <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]"><span>Entrega</span><span>{formatCurrency(pedido.taxaEntrega)}</span></div>
        <div className="mt-1 flex items-center justify-between text-sm font-semibold text-[var(--color-text-primary)]"><span>Total</span><span>{formatCurrency(pedido.total)}</span></div>
      </div>
      {pedido.observacao && (
        <div className="mt-3 rounded-md border border-[var(--color-warning)] bg-[var(--color-warning-muted)] p-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-warning-text)]">Observação do cliente</p>
          <p className="mt-1 text-sm text-[var(--color-warning-text)]">{pedido.observacao}</p>
        </div>
      )}
    </div>
  );
}
