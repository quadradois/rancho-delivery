import { describe, it, expect, vi, beforeEach } from 'vitest';
import pedidoService from '../../services/pedido.service';
import prisma from '../../config/database';
import clienteService from '../../services/cliente.service';
import bairroService from '../../services/bairro.service';
import infinitePayService from '../../services/infinitepay.service';
import { StatusPagamento, StatusPedido } from '@prisma/client';

vi.mock('../../services/cliente.service');
vi.mock('../../services/bairro.service');
vi.mock('../../services/infinitepay.service');
vi.mock('../../services/evolution.service');

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

  const mockProdutos = [
    { id: 'prod-1', nome: 'Marmita', preco: 24.9, disponivel: true },
    { id: 'prod-2', nome: 'Refrigerante', preco: 5, disponivel: true },
  ];

  it('cria pedido com sucesso e gera link no InfinitePay', async () => {
    vi.mocked(bairroService.validarBairro).mockResolvedValue({ valido: true, taxa: 6 });
    vi.mocked(prisma.produto.findMany).mockResolvedValue(mockProdutos as any);
    vi.mocked(clienteService.criarOuAtualizar).mockResolvedValue(mockCliente as any);

    const mockPedidoCriado = {
      id: 'pedido-123',
      subtotal: 54.8,
      taxaEntrega: 6,
      total: 60.8,
      status: 'AGUARDANDO_PAGAMENTO',
      tokenAcesso: 'abc123token',
      itens: [
        { produtoId: 'prod-1', quantidade: 2, precoUnit: 24.9, subtotal: 49.8, produto: { nome: 'Marmita' } },
        { produtoId: 'prod-2', quantidade: 1, precoUnit: 5, subtotal: 5, produto: { nome: 'Refrigerante' } },
      ],
      cliente: mockCliente,
    };

    vi.mocked(prisma.pedido.create).mockResolvedValue(mockPedidoCriado as any);

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
    expect(prisma.produto.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ['prod-1', 'prod-2'] } },
    }));
    expect(infinitePayService.criarLinkPagamento).toHaveBeenCalledWith(expect.objectContaining({
      order_nsu: 'pedido-123',
      redirect_url: 'https://rancho.delivery/pedido/pedido-123',
      webhook_url: 'https://rancho.delivery/webhook/infinitepay',
    }));
  });

  it('rejeita pedido com bairro não atendido', async () => {
    vi.mocked(bairroService.validarBairro).mockResolvedValue({ valido: false });

    await expect(pedidoService.criarPedido(dadosPedidoValido as any)).rejects.toThrow('Bairro não atendido');
    expect(prisma.produto.findMany).not.toHaveBeenCalled();
  });

  it('rejeita quando produto não existe', async () => {
    vi.mocked(bairroService.validarBairro).mockResolvedValue({ valido: true, taxa: 6 });
    // findMany retorna lista vazia — nenhum produto encontrado
    vi.mocked(prisma.produto.findMany).mockResolvedValue([]);

    await expect(pedidoService.criarPedido(dadosPedidoValido as any)).rejects.toThrow('Produto não encontrado: prod-1');
  });

  it('rejeita quando produto está indisponível', async () => {
    vi.mocked(bairroService.validarBairro).mockResolvedValue({ valido: true, taxa: 6 });
    vi.mocked(prisma.produto.findMany).mockResolvedValue([
      { id: 'prod-1', nome: 'Marmita', preco: 24.9, disponivel: false },
      { id: 'prod-2', nome: 'Refrigerante', preco: 5, disponivel: true },
    ] as any);

    await expect(pedidoService.criarPedido(dadosPedidoValido as any)).rejects.toThrow('Produto indisponível: Marmita');
  });

  it('evita N+1 ao deduplicar produtoId e consultar em lote uma única vez', async () => {
    const pedidoComProdutoRepetido = {
      ...dadosPedidoValido,
      itens: [
        { produtoId: 'prod-1', quantidade: 1 },
        { produtoId: 'prod-1', quantidade: 2 },
        { produtoId: 'prod-2', quantidade: 1 },
      ],
    };

    vi.mocked(bairroService.validarBairro).mockResolvedValue({ valido: true, taxa: 6 });
    vi.mocked(prisma.produto.findMany).mockResolvedValue(mockProdutos as any);
    vi.mocked(clienteService.criarOuAtualizar).mockResolvedValue(mockCliente as any);

    const mockPedidoCriado = {
      id: 'pedido-dup-1',
      subtotal: 79.7,
      taxaEntrega: 6,
      total: 85.7,
      status: 'AGUARDANDO_PAGAMENTO',
      tokenAcesso: 'dup-token',
      itens: [],
      cliente: mockCliente,
    };

    vi.mocked(prisma.pedido.create).mockResolvedValue(mockPedidoCriado as any);
    vi.mocked(infinitePayService.criarLinkPagamento).mockRejectedValue(new Error('gateway indisponível'));

    await pedidoService.criarPedido(pedidoComProdutoRepetido as any);

    expect(prisma.produto.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.produto.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ['prod-1', 'prod-2'] } },
    }));
  });

  it('mantém pedido criado quando link de pagamento falha', async () => {
    vi.mocked(bairroService.validarBairro).mockResolvedValue({ valido: true, taxa: 6 });
    vi.mocked(prisma.produto.findMany).mockResolvedValue(mockProdutos as any);
    vi.mocked(clienteService.criarOuAtualizar).mockResolvedValue(mockCliente as any);

    const mockPedidoCriado = {
      id: 'pedido-123',
      subtotal: 54.8,
      taxaEntrega: 6,
      total: 60.8,
      status: 'AGUARDANDO_PAGAMENTO',
      tokenAcesso: 'abc123token',
      itens: [],
      cliente: mockCliente,
    };

    vi.mocked(prisma.pedido.create).mockResolvedValue(mockPedidoCriado as any);
    vi.mocked(infinitePayService.criarLinkPagamento).mockRejectedValue(new Error('gateway indisponível'));

    const resultado = await pedidoService.criarPedido(dadosPedidoValido as any);
    expect(resultado.id).toBe('pedido-123');
    expect((resultado as any).linkPagamento).toBeUndefined();
  });

  it('reprocessa pedido sem link PIX e atualiza pagamentoId', async () => {
    const updateManyMock = vi.fn().mockResolvedValue({ count: 1 });
    (prisma.pedido as any).updateMany = updateManyMock;

    const pedidoSemLink = {
      id: 'pedido-sem-link',
      criadoEm: new Date(Date.now() - 5 * 60 * 1000),
      status: 'AGUARDANDO_PAGAMENTO',
      pagamentoId: null,
      taxaEntrega: 6,
      enderecoEntrega: 'Rua Teste, 123',
      bairroEntrega: 'Setor Bueno',
      itens: [
        { produtoId: 'prod-1', quantidade: 1, precoUnit: 24.9, produto: { nome: 'Marmita' } },
      ],
      cliente: mockCliente,
    };

    vi.mocked(prisma.pedido.findMany).mockResolvedValue([pedidoSemLink] as any);
    vi.mocked(infinitePayService.reaisParaCentavos).mockImplementation((v: number) => Math.round(v * 100));
    vi.mocked(infinitePayService.criarLinkPagamento).mockResolvedValue({
      id: 'pix-reprocessado-1',
      url: 'https://infinitepay.io/checkout/reproc',
      order_nsu: 'pedido-sem-link',
    } as any);
    vi.mocked(prisma.pedidoTimeline.create).mockResolvedValue({} as any);

    const resultado = await pedidoService.reprocessarPedidosSemLink();

    expect(resultado).toEqual({ total: 1, reprocessados: 1, falhas: 0 });
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: 'pedido-sem-link', pagamentoId: null },
      data: { pagamentoId: 'pix-reprocessado-1' },
    });
  });

  it('contabiliza falha quando reprocessamento PIX falha', async () => {
    const updateManyMock = vi.fn().mockResolvedValue({ count: 1 });
    (prisma.pedido as any).updateMany = updateManyMock;

    const pedidoSemLink = {
      id: 'pedido-falha-link',
      criadoEm: new Date(Date.now() - 5 * 60 * 1000),
      status: 'AGUARDANDO_PAGAMENTO',
      pagamentoId: null,
      taxaEntrega: 0,
      enderecoEntrega: 'Rua Teste, 123',
      bairroEntrega: 'Setor Bueno',
      itens: [
        { produtoId: 'prod-1', quantidade: 1, precoUnit: 24.9, produto: { nome: 'Marmita' } },
      ],
      cliente: mockCliente,
    };

    vi.mocked(prisma.pedido.findMany).mockResolvedValue([pedidoSemLink] as any);
    vi.mocked(infinitePayService.reaisParaCentavos).mockImplementation((v: number) => Math.round(v * 100));
    vi.mocked(infinitePayService.criarLinkPagamento).mockRejectedValue(new Error('gateway off'));

    const resultado = await pedidoService.reprocessarPedidosSemLink();

    expect(resultado).toEqual({ total: 1, reprocessados: 0, falhas: 1 });
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it('atualiza status para CONFIRMADO e confirma statusPagamento', async () => {
    vi.mocked(prisma.pedido.findUnique).mockResolvedValue({
      status: StatusPedido.AGUARDANDO_PAGAMENTO,
      statusPagamento: StatusPagamento.PENDENTE,
    } as any);
    vi.mocked(prisma.pedido.update).mockResolvedValue({ id: 'p-1', status: StatusPedido.CONFIRMADO } as any);
    vi.mocked(prisma.pedidoTimeline.create).mockResolvedValue({} as any);
    vi.mocked(prisma.pedido.findUnique).mockResolvedValueOnce({
      status: StatusPedido.AGUARDANDO_PAGAMENTO,
      statusPagamento: StatusPagamento.PENDENTE,
    } as any);
    vi.mocked(prisma.pedido.findUnique).mockResolvedValueOnce({
      id: 'p-1',
      tokenAcesso: 't',
      status: StatusPedido.CONFIRMADO,
      itens: [],
      cliente: { nome: 'João', telefone: '5562999887766', endereco: 'Rua', bairro: 'Setor' },
    } as any);

    await pedidoService.atualizarStatus('p-1', StatusPedido.CONFIRMADO, 'pag-1');

    expect(prisma.pedido.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'p-1' },
      data: expect.objectContaining({
        status: StatusPedido.CONFIRMADO,
        statusPagamento: StatusPagamento.CONFIRMADO,
      }),
    }));
  });

  it('processa expiração e abandono com updateMany por status', async () => {
    const updateManyMock = vi
      .fn()
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 1 });
    (prisma.pedido as any).updateMany = updateManyMock;

    const resultado = await pedidoService.processarExpiracoesEAbandonos();

    expect(updateManyMock).toHaveBeenCalledTimes(2);
    expect(resultado).toEqual({ expirados: 2, abandonados: 1 });
  });

  it('atualizarStatusAdmin bloqueia transição inválida', async () => {
    vi.mocked(prisma.pedido.findUnique).mockResolvedValue({
      id: 'p-2',
      status: StatusPedido.ENTREGUE,
      statusPagamento: StatusPagamento.CONFIRMADO,
    } as any);

    await expect(
      pedidoService.atualizarStatusAdmin('p-2', StatusPedido.PREPARANDO, undefined, 'admin'),
    ).rejects.toThrow('TRANSICAO_INVALIDA');
  });

  it('obterFilaUrgente prioriza pagamento pendente e SLA estourado', async () => {
    vi.mocked(prisma.pedido.findMany)
      .mockResolvedValueOnce([
        {
          id: 'pedido-1',
          clienteTelefone: '5562999000001',
          status: StatusPedido.AGUARDANDO_PAGAMENTO,
          statusPagamento: StatusPagamento.CONFIRMADO,
          statusMudouEm: new Date(Date.now() - 10 * 60 * 1000),
          atualizadoEm: new Date(Date.now() - 10 * 60 * 1000),
          cliente: { nome: 'Cliente 1', telefone: '5562999000001' },
          itens: [{ produto: { nome: 'Marmita' } }],
        },
        {
          id: 'pedido-2',
          clienteTelefone: '5562999000002',
          status: StatusPedido.PREPARANDO,
          statusPagamento: StatusPagamento.PENDENTE,
          statusMudouEm: new Date(Date.now() - 40 * 60 * 1000),
          atualizadoEm: new Date(Date.now() - 40 * 60 * 1000),
          cliente: { nome: 'Cliente 2', telefone: '5562999000002' },
          itens: [{ produto: { nome: 'Refri' } }],
        },
      ] as any)
      .mockResolvedValueOnce([] as any);

    vi.mocked(prisma.mensagemCliente.findMany).mockResolvedValue([] as any);

    const fila = await pedidoService.obterFilaUrgente();
    expect(fila.length).toBeGreaterThan(0);
    expect(fila[0].tipo).toBe('PAGAMENTO_PENDENTE');
  });

  it('cria reorder reaproveitando itens do pedido original', async () => {
    vi.mocked(prisma.pedido.findUnique).mockResolvedValueOnce({
      id: 'pedido-original',
      enderecoEntrega: 'Rua 1',
      bairroEntrega: 'Setor Bueno',
      cliente: mockCliente,
      itens: [{ produtoId: 'prod-1', quantidade: 2, observacao: 'sem cebola' }],
    } as any);

    vi.mocked(bairroService.validarBairro).mockResolvedValue({ valido: true, taxa: 6 });
    vi.mocked(prisma.produto.findMany).mockResolvedValue([{ id: 'prod-1', nome: 'Marmita', preco: 24.9, disponivel: true }] as any);
    vi.mocked(clienteService.criarOuAtualizar).mockResolvedValue(mockCliente as any);
    vi.mocked(prisma.pedido.create).mockResolvedValue({
      id: 'pedido-reorder',
      subtotal: 49.8,
      taxaEntrega: 6,
      total: 55.8,
      status: 'AGUARDANDO_PAGAMENTO',
      tokenAcesso: 'tok',
      itens: [],
      cliente: mockCliente,
    } as any);
    vi.mocked(infinitePayService.criarLinkPagamento).mockRejectedValue(new Error('gateway indisponível'));

    const novo = await pedidoService.criarReorder('pedido-original');
    expect(novo.id).toBe('pedido-reorder');
  });

  it('registra NPS apenas para pedido entregue', async () => {
    vi.mocked(prisma.pedido.findUnique).mockResolvedValueOnce({
      id: 'pedido-nps',
      status: StatusPedido.ENTREGUE,
    } as any);
    vi.mocked(prisma.pedido.update).mockResolvedValue({
      id: 'pedido-nps',
      npsNota: 5,
      npsFeedback: null,
      atualizadoEm: new Date(),
    } as any);
    vi.mocked(prisma.pedidoTimeline.create).mockResolvedValue({} as any);

    const resultado = await pedidoService.registrarNps('pedido-nps', 5);
    expect(resultado.id).toBe('pedido-nps');
    expect(resultado.npsNota).toBe(5);
  });
});
