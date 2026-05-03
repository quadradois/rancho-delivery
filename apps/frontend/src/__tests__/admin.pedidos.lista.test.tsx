import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ListaPedidos } from '@/app/admin/pedidos/_components/ListaPedidos';

vi.mock('@/components/crm', () => ({
  CrmBadge: ({ children }: any) => <span>{children}</span>,
  CrmButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  CrmCard: ({ children }: any) => <div>{children}</div>,
  CrmTimer: () => <span>timer</span>,
}));

const basePedido = {
  id: 'ped-1',
  numero: '000001',
  status: 'AGUARDANDO_PAGAMENTO',
  statusPagamento: 'CONFIRMADO' as const,
  clienteNome: 'Cliente Teste',
  clienteTelefone: '62999990000',
  bairro: 'Centro',
  itensResumo: ['Marmita'],
  mensagensNaoLidas: 0,
  total: 50,
  createdAt: new Date().toISOString(),
  tempoNoEstagio: 120,
  formaPagamento: 'PIX' as const,
  tipoAtendimento: 'ENTREGA' as const,
};

describe('ListaPedidos', () => {
  it('habilita confirmar para AGUARDANDO_PAGAMENTO com CONFIRMADO', () => {
    const onConfirmar = vi.fn();
    render(
      <ListaPedidos
        pedidos={[basePedido]}
        loading={false}
        modoPico={false}
        selectedId={null}
        onSelect={() => {}}
        onConfirmar={onConfirmar}
        page={1}
        totalPedidos={1}
        pageSize={50}
        onPageChange={() => {}}
      />
    );
    const btn = screen.getByRole('button', { name: 'Confirmar' });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onConfirmar).toHaveBeenCalledWith('ped-1');
  });

  it('habilita confirmar para AGUARDANDO_PAGAMENTO com A_RECEBER', () => {
    render(
      <ListaPedidos
        pedidos={[{ ...basePedido, statusPagamento: 'A_RECEBER' as const }]}
        loading={false}
        modoPico={false}
        selectedId={null}
        onSelect={() => {}}
        onConfirmar={() => {}}
        page={1}
        totalPedidos={1}
        pageSize={50}
        onPageChange={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'Confirmar' })).not.toBeDisabled();
  });

  it('pedido encerrado (ENTREGUE) não exibe botão Confirmar', () => {
    render(
      <ListaPedidos
        pedidos={[{ ...basePedido, status: 'ENTREGUE' }]}
        loading={false}
        modoPico={false}
        selectedId={null}
        onSelect={() => {}}
        onConfirmar={() => {}}
        page={1}
        totalPedidos={1}
        pageSize={50}
        onPageChange={() => {}}
      />
    );
    // Pedidos encerrados ficam na seção "Encerrados hoje" sem o botão de ação
    expect(screen.queryByRole('button', { name: 'Confirmar' })).toBeNull();
  });

  it('pedido PREPARANDO (ativo) exibe botão Confirmar bloqueado', () => {
    render(
      <ListaPedidos
        pedidos={[{ ...basePedido, status: 'PREPARANDO', statusPagamento: 'A_RECEBER' as const }]}
        loading={false}
        modoPico={false}
        selectedId={null}
        onSelect={() => {}}
        onConfirmar={() => {}}
        page={1}
        totalPedidos={1}
        pageSize={50}
        onPageChange={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
  });

  it('mantém compatibilidade com pedido legado sem formaPagamento/tipoAtendimento', () => {
    render(
      <ListaPedidos
        pedidos={[{ ...basePedido, formaPagamento: undefined as any, tipoAtendimento: undefined as any }]}
        loading={false}
        modoPico={false}
        selectedId={null}
        onSelect={() => {}}
        onConfirmar={() => {}}
        page={1}
        totalPedidos={1}
        pageSize={50}
        onPageChange={() => {}}
      />
    );
    expect(screen.getByText('PIX · ENTREGA')).toBeInTheDocument();
  });

  it('exibe destaque de aguardando entregador para pedido PRONTO derivado', () => {
    render(
      <ListaPedidos
        pedidos={[{ ...basePedido, status: 'PRONTO', aguardandoEntregador: true } as any]}
        loading={false}
        modoPico={false}
        selectedId={null}
        onSelect={() => {}}
        onConfirmar={() => {}}
        page={1}
        totalPedidos={1}
        pageSize={50}
        onPageChange={() => {}}
      />
    );
    expect(screen.getByText('Aguardando entregador')).toBeInTheDocument();
  });
});
