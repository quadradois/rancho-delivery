import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PedidoTicket } from '@/app/admin/pedidos/_components/PedidoTicket';

describe('PedidoTicket', () => {
  it('renderiza observacao geral e observacao por item', () => {
    const pedido: any = {
      numero: '000123',
      createdAt: new Date('2026-05-03T12:00:00Z').toISOString(),
      cliente: {
        nome: 'Cliente Teste',
        telefone: '62999990000',
        endereco: 'Rua 1',
        bairro: 'Centro',
      },
      formaPagamento: 'DINHEIRO',
      trocoPara: 50,
      subtotal: 30,
      taxaEntrega: 5,
      total: 35,
      observacao: 'Sem cebola no pedido inteiro',
      itens: [
        {
          id: 'item-1',
          quantidade: 1,
          subtotal: 20,
          observacao: 'Molho separado',
          produto: { nome: 'X-Burger' },
        },
      ],
    };

    render(<PedidoTicket pedido={pedido} />);

    expect(screen.getByText('Observação do cliente')).toBeInTheDocument();
    expect(screen.getByText('Sem cebola no pedido inteiro')).toBeInTheDocument();
    expect(screen.getByText('Obs item: Molho separado')).toBeInTheDocument();
    expect(screen.getByText(/Cliente:/)).toBeInTheDocument();
    expect(screen.getByText(/Endereço:/)).toBeInTheDocument();
    expect(screen.getByText(/Pagamento:/)).toBeInTheDocument();
    expect(screen.getByText(/Troco para:/)).toBeInTheDocument();
    expect(screen.getByTestId('print-ticket')).toBeInTheDocument();
  });
});
