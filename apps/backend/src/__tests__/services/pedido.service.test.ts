import { describe, it, expect, vi, beforeEach } from 'vitest';
import pedidoService from '../../services/pedido.service';
import prisma from '../../config/database';
import clienteService from '../../services/cliente.service';
import bairroService from '../../services/bairro.service';
import produtoService from '../../services/produto.service';
import infinitePayService from '../../services/infinitepay.service';

vi.mock('../../services/cliente.service');
vi.mock('../../services/bairro.service');
vi.mock('../../services/produto.service');
vi.mock('../../services/infinitepay.service');

describe('PedidoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FRONTEND_URL = 'https://rancho.delivery';
    process.env.INFINITEPAY_WEBHOOK_URL = 'https://rancho.delivery/webhook/infinitepay';
  });

  const dadosPedidoValido = {
    cliente: {
      telefone: '5562999887766',
      nome: 'João Silva',
      endereco: 'Rua Teste, 123',
      bairro: 'Setor Bueno',
    },
    itens: [
      { produtoId: 'prod-1', quantidade: 2, observacao: 'Sem cebola' },
      { produtoId: 'prod-2', quantidade: 1 },
    ],
    observacao: 'Entregar na portaria',
  };

  const mockCliente = {
    telefone: '5562999887766',
    nome: 'João Silva',
    endereco: 'Rua Teste, 123',
    bairro: 'Setor Bueno',
    origem: 'SITE',
    criadoEm: new Date(),
  };

  it('cria pedido com sucesso e gera link no InfinitePay', async () => {
    vi.mocked(bairroService.validarBairro).mockResolvedValue({ valido: true, taxa: 6 });

    vi.mocked(produtoService.buscarProdutoPorId)
      .mockResolvedValueOnce({ id: 'prod-1', nome: 'Marmita', preco: 24.9, disponivel: true } as any)
      .mockResolvedValueOnce({ id: 'prod-2', nome: 'Refrigerante', preco: 5, disponivel: true } as any);

    vi.mocked(clienteService.criarOuAtualizar).mockResolvedValue(mockCliente as any);

    const mockPedidoCriado = {
      id: 'pedido-123',
      subtotal: 54.8,
      taxaEntrega: 6,
      total: 60.8,
      status: 'PENDENTE',
      itens: [
        { produtoId: 'prod-1', quantidade: 2, precoUnit: 24.9, subtotal: 49.8, produto: { nome: 'Marmita' } },
        { produtoId: 'prod-2', quantidade: 1, precoUnit: 5, subtotal: 5, produto: { nome: 'Refrigerante' } },
      ],
      cliente: mockCliente,
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) =>
      cb({ pedido: { create: vi.fn().mockResolvedValue(mockPedidoCriado) } })
    );

    vi.mocked(infinitePayService.reaisParaCentavos).mockImplementation((v: number) => Math.round(v * 100));
    vi.mocked(infinitePayService.criarLinkPagamento).mockResolvedValue({
      id: 'link-123',
      url: 'https://infinitepay.io/checkout/123',
      order_nsu: 'pedido-123',
    });

    vi.mocked(prisma.pedido.update).mockResolvedValue({} as any);

    const resultado = await pedidoService.criarPedido(dadosPedidoValido as any);

    expect(resultado.id).toBe('pedido-123');
    expect((resultado as any).linkPagamento).toContain('infinitepay');
    expect(infinitePayService.criarLinkPagamento).toHaveBeenCalledWith(expect.objectContaining({
      order_nsu: 'pedido-123',
      redirect_url: 'https://rancho.delivery/pedido/pedido-123',
      webhook_url: 'https://rancho.delivery/webhook/infinitepay',
    }));
  });

  it('rejeita pedido com bairro não atendido', async () => {
    vi.mocked(bairroService.validarBairro).mockResolvedValue({ valido: false });

    await expect(pedidoService.criarPedido(dadosPedidoValido as any)).rejects.toThrow('Bairro não atendido');
    expect(produtoService.buscarProdutoPorId).not.toHaveBeenCalled();
  });

  it('rejeita quando produto não existe', async () => {
    vi.mocked(bairroService.validarBairro).mockResolvedValue({ valido: true, taxa: 6 });
    vi.mocked(produtoService.buscarProdutoPorId).mockResolvedValue(null);

    await expect(pedidoService.criarPedido(dadosPedidoValido as any)).rejects.toThrow('Produto não encontrado: prod-1');
  });

  it('mantém pedido criado quando link de pagamento falha', async () => {
    vi.mocked(bairroService.validarBairro).mockResolvedValue({ valido: true, taxa: 6 });

    vi.mocked(produtoService.buscarProdutoPorId)
      .mockResolvedValueOnce({ id: 'prod-1', nome: 'Marmita', preco: 24.9, disponivel: true } as any)
      .mockResolvedValueOnce({ id: 'prod-2', nome: 'Refrigerante', preco: 5, disponivel: true } as any);

    vi.mocked(clienteService.criarOuAtualizar).mockResolvedValue(mockCliente as any);

    const mockPedidoCriado = {
      id: 'pedido-123',
      subtotal: 54.8,
      taxaEntrega: 6,
      total: 60.8,
      status: 'PENDENTE',
      itens: [],
      cliente: mockCliente,
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) =>
      cb({ pedido: { create: vi.fn().mockResolvedValue(mockPedidoCriado) } })
    );

    vi.mocked(infinitePayService.criarLinkPagamento).mockRejectedValue(new Error('gateway indisponível'));

    const resultado = await pedidoService.criarPedido(dadosPedidoValido as any);
    expect(resultado.id).toBe('pedido-123');
    expect((resultado as any).linkPagamento).toBeUndefined();
  });
});
