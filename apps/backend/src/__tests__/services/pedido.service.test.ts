import { describe, it, expect, vi, beforeEach } from 'vitest';
import pedidoService from '../../services/pedido.service';
import prisma from '../../config/database';
import clienteService from '../../services/cliente.service';
import bairroService from '../../services/bairro.service';
import mercadoPagoService from '../../services/mercadopago.service';
import { FormaPagamentoPedido, StatusPagamento, StatusPedido, TipoAtendimentoPedido } from '@prisma/client';

vi.mock('../../services/cliente.service');
vi.mock('../../services/bairro.service');
vi.mock('../../services/mercadopago.service');
vi.mock('../../services/evolution.service');

describe('PedidoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FRONTEND_URL = 'https://rancho.delivery';
    process.env.MERCADOPAGO_WEBHOOK_URL = 'https://rancho.delivery/webhook/mercadopago';
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

  it('cria pedido com sucesso e gera link no Mercado Pago', async () => {
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

    vi.mocked(mercadoPagoService.reaisParaCentavos).mockImplementation((v: number) => Math.round(v * 100));
    vi.mocked(mercadoPagoService.criarLinkPagamento).mockResolvedValue({
      id: 'link-123',
      url: 'https://mercadopago.com/checkout/123',
      order_nsu: 'pedido-123',
    });

    vi.mocked(prisma.pedido.update).mockResolvedValue({} as any);

    const resultado = await pedidoService.criarPedido(dadosPedidoValido as any);

    expect(resultado.id).toBe('pedido-123');
    expect((resultado as any).linkPagamento).toContain('mercadopago');
    expect(prisma.produto.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ['prod-1', 'prod-2'] } },
    }));
    expect(mercadoPagoService.criarLinkPagamento).toHaveBeenCalledWith(expect.objectContaining({
      order_nsu: 'pedido-123',
      redirect_url: 'https://rancho.delivery/pedido/pedido-123',
      webhook_url: 'https://rancho.delivery/webhook/mercadopago',
    }));
  });

  it('rejeita pedido com bairro não atendido', async () => {
    vi.mocked(bairroService.validarBairro).mockResolvedValue({ valido: false });

    await expect(pedidoService.criarPedido(dadosPedidoValido as any)).rejects.toThrow('Bairro não atendido');
    expect(prisma.produto.findMany).not.toHaveBeenCalled();
  });

  it('cria pedido RETIRADA sem chamar bairroService e com taxaEntrega=0', async () => {
    vi.mocked(prisma.produto.findMany).mockResolvedValue(mockProdutos as any);
    vi.mocked(clienteService.criarOuAtualizar).mockResolvedValue(mockCliente as any);
    vi.mocked(prisma.pedido.create).mockResolvedValue({
      id: 'pedido-retirada',
      subtotal: 54.8,
      taxaEntrega: 0,
      total: 54.8,
      status: 'CONFIRMADO',
      tokenAcesso: 'tok-ret',
      itens: [],
      cliente: mockCliente,
    } as any);

    const dadosRetirada = {
      ...dadosPedidoValido,
      tipoAtendimento: TipoAtendimentoPedido.RETIRADA,
      pagamento: { forma: FormaPagamentoPedido.DINHEIRO },
    };

    const resultado = await pedidoService.criarPedido(dadosRetirada as any);

    expect(resultado.id).toBe('pedido-retirada');
    expect(bairroService.validarBairro).not.toHaveBeenCalled();
    expect(prisma.pedido.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ taxaEntrega: 0, tipoAtendimento: TipoAtendimentoPedido.RETIRADA }),
      }),
    );
  });

  it('cria pedido CONSUMO_LOCAL sem endereço e com taxaEntrega=0', async () => {
    vi.mocked(prisma.produto.findMany).mockResolvedValue(mockProdutos as any);
    vi.mocked(clienteService.criarOuAtualizar).mockResolvedValue(mockCliente as any);
    vi.mocked(prisma.pedido.create).mockResolvedValue({
      id: 'pedido-local',
      subtotal: 54.8,
      taxaEntrega: 0,
      total: 54.8,
      status: 'CONFIRMADO',
      tokenAcesso: 'tok-loc',
      itens: [],
      cliente: mockCliente,
    } as any);

    const dadosLocal = {
      cliente: { telefone: '5562999887766', nome: 'João Silva', endereco: '', bairro: '' },
      itens: [{ produtoId: 'prod-1', quantidade: 1 }],
      tipoAtendimento: TipoAtendimentoPedido.CONSUMO_LOCAL,
      pagamento: { forma: FormaPagamentoPedido.DINHEIRO },
    };

    const resultado = await pedidoService.criarPedido(dadosLocal as any);

    expect(resultado.id).toBe('pedido-local');
    expect(bairroService.validarBairro).not.toHaveBeenCalled();
    expect(prisma.pedido.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ taxaEntrega: 0, tipoAtendimento: TipoAtendimentoPedido.CONSUMO_LOCAL }),
      }),
    );
  });

  it('rejeita pedido ENTREGA sem endereço', async () => {
    const dadosSemEndereco = {
      cliente: { telefone: '5562999887766', nome: 'João Silva', endereco: '', bairro: '' },
      itens: [{ produtoId: 'prod-1', quantidade: 1 }],
      tipoAtendimento: TipoAtendimentoPedido.ENTREGA,
    };

    await expect(pedidoService.criarPedido(dadosSemEndereco as any)).rejects.toThrow('ENDERECO_OBRIGATORIO_ENTREGA');
    expect(bairroService.validarBairro).not.toHaveBeenCalled();
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
    vi.mocked(mercadoPagoService.criarLinkPagamento).mockRejectedValue(new Error('gateway indisponível'));

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
    vi.mocked(mercadoPagoService.criarLinkPagamento).mockRejectedValue(new Error('gateway indisponível'));

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
    vi.mocked(mercadoPagoService.reaisParaCentavos).mockImplementation((v: number) => Math.round(v * 100));
    vi.mocked(mercadoPagoService.criarLinkPagamento).mockResolvedValue({
      id: 'pix-reprocessado-1',
      url: 'https://mercadopago.com/checkout/reproc',
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
    vi.mocked(mercadoPagoService.reaisParaCentavos).mockImplementation((v: number) => Math.round(v * 100));
    vi.mocked(mercadoPagoService.criarLinkPagamento).mockRejectedValue(new Error('gateway off'));

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

  it('permite transição AGUARDANDO_PAGAMENTO -> CONFIRMADO com pagamento PIX confirmado', async () => {
    vi.mocked(prisma.pedido.findUnique).mockResolvedValueOnce({
      status: StatusPedido.AGUARDANDO_PAGAMENTO,
      statusPagamento: StatusPagamento.CONFIRMADO,
    } as any);
    vi.mocked(prisma.pedido.findUnique).mockResolvedValueOnce({
      id: 'p-pix',
      tokenAcesso: 'tok-pix',
      status: StatusPedido.CONFIRMADO,
      itens: [],
      cliente: { nome: 'Cliente PIX', telefone: '5562999990001', endereco: 'Rua A', bairro: 'Centro' },
    } as any);
    vi.mocked(prisma.pedido.update).mockResolvedValue({ id: 'p-pix', status: StatusPedido.CONFIRMADO } as any);
    vi.mocked(prisma.pedidoTimeline.create).mockResolvedValue({} as any);

    await pedidoService.atualizarStatus('p-pix', StatusPedido.CONFIRMADO, 'pag-pix');

    expect(prisma.pedido.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'p-pix' },
      data: expect.objectContaining({
        status: StatusPedido.CONFIRMADO,
        statusPagamento: StatusPagamento.CONFIRMADO,
      }),
    }));
  });

  it('permite transição AGUARDANDO_PAGAMENTO -> CONFIRMADO com pagamento A_RECEBER sem regressão', async () => {
    vi.mocked(prisma.pedido.findUnique).mockResolvedValueOnce({
      status: StatusPedido.AGUARDANDO_PAGAMENTO,
      statusPagamento: StatusPagamento.A_RECEBER,
    } as any);
    vi.mocked(prisma.pedido.findUnique).mockResolvedValueOnce({
      id: 'p-cash',
      tokenAcesso: 'tok-cash',
      status: StatusPedido.CONFIRMADO,
      itens: [],
      cliente: { nome: 'Cliente Cash', telefone: '5562999990002', endereco: 'Rua B', bairro: 'Setor Sul' },
    } as any);
    vi.mocked(prisma.pedido.update).mockResolvedValue({ id: 'p-cash', status: StatusPedido.CONFIRMADO } as any);
    vi.mocked(prisma.pedidoTimeline.create).mockResolvedValue({} as any);

    await pedidoService.atualizarStatus('p-cash', StatusPedido.CONFIRMADO, 'pag-cash');

    expect(prisma.pedido.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'p-cash' },
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

  it('atualizarStatusAdmin permite PREPARANDO -> PRONTO', async () => {
    vi.mocked(prisma.pedido.findUnique).mockResolvedValueOnce({
      id: 'p-3',
      status: StatusPedido.PREPARANDO,
      statusPagamento: StatusPagamento.CONFIRMADO,
    } as any);
    vi.mocked(prisma.pedido.update).mockResolvedValue({ id: 'p-3', status: StatusPedido.PRONTO } as any);
    vi.mocked(prisma.pedidoTimeline.create).mockResolvedValue({} as any);

    const atualizado = await pedidoService.atualizarStatusAdmin('p-3', StatusPedido.PRONTO, undefined, 'admin');
    expect(atualizado.status).toBe(StatusPedido.PRONTO);
  });

  it('atualizarStatusAdmin permite PRONTO -> SAIU_ENTREGA com motoboy atribuído', async () => {
    vi.mocked(prisma.pedido.findUnique).mockReset();
    vi.mocked(prisma.pedido.update).mockReset();
    vi.mocked(prisma.pedido.findUnique).mockResolvedValueOnce({
      id: 'p-4',
      status: StatusPedido.PRONTO,
      statusPagamento: StatusPagamento.CONFIRMADO,
      tipoAtendimento: TipoAtendimentoPedido.ENTREGA,
      motoboyId: 'mb-1',
    } as any);
    vi.mocked(prisma.pedido.update).mockResolvedValue({ id: 'p-4', status: StatusPedido.SAIU_ENTREGA } as any);
    vi.mocked(prisma.pedidoTimeline.create).mockResolvedValue({} as any);

    const atualizado = await pedidoService.atualizarStatusAdmin('p-4', StatusPedido.SAIU_ENTREGA, undefined, 'admin');
    expect(atualizado.status).toBe(StatusPedido.SAIU_ENTREGA);
  });

  it('atualizarStatusAdmin bloqueia PRONTO -> SAIU_ENTREGA sem motoboy quando tipoAtendimento=ENTREGA', async () => {
    vi.mocked(prisma.pedido.findUnique).mockResolvedValueOnce({
      id: 'p-5',
      status: StatusPedido.PRONTO,
      statusPagamento: StatusPagamento.CONFIRMADO,
      tipoAtendimento: TipoAtendimentoPedido.ENTREGA,
      motoboyId: null,
    } as any);

    await expect(
      pedidoService.atualizarStatusAdmin('p-5', StatusPedido.SAIU_ENTREGA, undefined, 'admin'),
    ).rejects.toThrow('DESPACHO_SEM_ENTREGADOR');
  });

  it('atualizarStatusAdmin permite PRONTO -> SAIU_ENTREGA sem motoboy quando tipoAtendimento=RETIRADA', async () => {
    vi.mocked(prisma.pedido.findUnique).mockResolvedValueOnce({
      id: 'p-6',
      status: StatusPedido.PRONTO,
      statusPagamento: StatusPagamento.CONFIRMADO,
      tipoAtendimento: TipoAtendimentoPedido.RETIRADA,
      motoboyId: null,
    } as any);
    vi.mocked(prisma.pedido.update).mockResolvedValue({ id: 'p-6', status: StatusPedido.SAIU_ENTREGA } as any);
    vi.mocked(prisma.pedidoTimeline.create).mockResolvedValue({} as any);

    const atualizado = await pedidoService.atualizarStatusAdmin('p-6', StatusPedido.SAIU_ENTREGA, undefined, 'admin');
    expect(atualizado.status).toBe(StatusPedido.SAIU_ENTREGA);
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
    vi.mocked(mercadoPagoService.criarLinkPagamento).mockRejectedValue(new Error('gateway indisponível'));

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

  it('deriva aguardandoEntregador na lista admin quando PRONTO sem motoboy', async () => {
    vi.mocked(prisma.pedido.findMany).mockResolvedValue([
      {
        id: 'p-derivado-1',
        status: StatusPedido.PRONTO,
        statusPagamento: StatusPagamento.CONFIRMADO,
        formaPagamento: 'PIX',
        trocoPara: null,
        tipoAtendimento: 'ENTREGA',
        motoboyId: null,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
        statusMudouEm: new Date(),
        total: 30,
        bairroEntrega: 'Centro',
        cliente: { nome: 'Cliente 1', telefone: '5562999000001', bairro: 'Centro' },
        itens: [{ produto: { nome: 'Marmita' } }],
      },
    ] as any);
    (prisma.pedido as any).count = vi.fn().mockResolvedValue(1);
    (prisma.mensagemCliente as any).groupBy = vi.fn().mockResolvedValue([]);

    const res = await pedidoService.listarPedidosAdmin();
    expect(res.data[0].aguardandoEntregador).toBe(true);
  });

  it('deriva aguardandoEntregador no detalhe admin quando PRONTO sem motoboy', async () => {
    vi.mocked(prisma.pedido.findUnique).mockResolvedValue({
      id: 'p-derivado-2',
      status: StatusPedido.PRONTO,
      statusPagamento: StatusPagamento.CONFIRMADO,
      formaPagamento: 'PIX',
      trocoPara: null,
      tipoAtendimento: 'ENTREGA',
      motoboyId: null,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      statusMudouEm: new Date(),
      pagamentoId: null,
      observacao: null,
      observacaoEntrega: null,
      canceladoMotivo: null,
      estornoNecessario: false,
      estornoRealizadoEm: null,
      subtotal: 25,
      taxaEntrega: 5,
      total: 30,
      cliente: { nome: 'Cliente 2', telefone: '5562999000002', endereco: 'Rua A', bairro: 'Centro' },
      itens: [],
      motoboy: null,
      timeline: [],
    } as any);

    const res = await pedidoService.buscarPedidoAdminPorId('p-derivado-2');
    expect(res?.aguardandoEntregador).toBe(true);
  });
});

describe('obterMetricasAdmin', () => {
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  function mockMetricasBase(pedidosPronto: { tipoAtendimento: string; motoboyId: string | null; statusMudouEm: Date }[]) {
    vi.mocked(prisma.pedido.groupBy).mockResolvedValue([] as any);
    vi.mocked(prisma.pedido.aggregate)
      .mockResolvedValueOnce({ _sum: { total: 500 } } as any)
      .mockResolvedValueOnce({ _sum: { total: 400 } } as any);
    vi.mocked(prisma.pedido.count)
      .mockResolvedValueOnce(10 as any)
      .mockResolvedValueOnce(2 as any)
      .mockResolvedValueOnce(7 as any);
    vi.mocked(prisma.mensagemCliente.count).mockResolvedValue(3 as any);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ avg_segundos: null }] as any);
    vi.mocked(prisma.pedido.findMany).mockResolvedValue(pedidosPronto as any);
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aguardandoEntregador conta apenas PRONTO com tipoAtendimento=ENTREGA e sem motoboy', async () => {
    const statusMudouEm = new Date(Date.now() - 5 * 60 * 1000); // 5 min atrás
    mockMetricasBase([
      { tipoAtendimento: 'ENTREGA', motoboyId: null, statusMudouEm },       // conta
      { tipoAtendimento: 'ENTREGA', motoboyId: 'mb-1', statusMudouEm },     // tem motoboy, não conta
      { tipoAtendimento: 'RETIRADA', motoboyId: null, statusMudouEm },      // retirada, não conta
      { tipoAtendimento: 'CONSUMO_LOCAL', motoboyId: null, statusMudouEm }, // consumo local, não conta
    ]);

    const metricas = await pedidoService.obterMetricasAdmin();

    expect(metricas.aguardandoEntregador).toBe(1);
  });

  it('prontoParaRetirada conta PRONTO com tipoAtendimento=RETIRADA ou CONSUMO_LOCAL', async () => {
    const statusMudouEm = new Date(Date.now() - 3 * 60 * 1000);
    mockMetricasBase([
      { tipoAtendimento: 'ENTREGA', motoboyId: null, statusMudouEm },
      { tipoAtendimento: 'RETIRADA', motoboyId: null, statusMudouEm },
      { tipoAtendimento: 'CONSUMO_LOCAL', motoboyId: null, statusMudouEm },
      { tipoAtendimento: 'ENTREGA', motoboyId: 'mb-2', statusMudouEm },
    ]);

    const metricas = await pedidoService.obterMetricasAdmin();

    expect(metricas.prontoParaRetirada).toBe(3); // RETIRADA + CONSUMO_LOCAL + ENTREGA com motoboy
  });

  it('tempoMedioAguardandoEntregadorMs calcula média correta', async () => {
    const agora = Date.now();
    mockMetricasBase([
      { tipoAtendimento: 'ENTREGA', motoboyId: null, statusMudouEm: new Date(agora - 60_000) },  // 1 min
      { tipoAtendimento: 'ENTREGA', motoboyId: null, statusMudouEm: new Date(agora - 180_000) }, // 3 min
    ]);

    const metricas = await pedidoService.obterMetricasAdmin();

    // média: (60000 + 180000) / 2 = 120000ms ± margem de execução
    expect(metricas.tempoMedioAguardandoEntregadorMs).toBeGreaterThanOrEqual(119_000);
    expect(metricas.tempoMedioAguardandoEntregadorMs).toBeLessThanOrEqual(121_000);
  });

  it('tempoMedioAguardandoEntregadorMs é null quando não há pedidos aguardando entregador', async () => {
    mockMetricasBase([
      { tipoAtendimento: 'RETIRADA', motoboyId: null, statusMudouEm: new Date() },
    ]);

    const metricas = await pedidoService.obterMetricasAdmin();

    expect(metricas.tempoMedioAguardandoEntregadorMs).toBeNull();
  });

  it('retorna zeros corretos quando não há pedidos PRONTO', async () => {
    mockMetricasBase([]);

    const metricas = await pedidoService.obterMetricasAdmin();

    expect(metricas.aguardandoEntregador).toBe(0);
    expect(metricas.prontoParaRetirada).toBe(0);
    expect(metricas.tempoMedioAguardandoEntregadorMs).toBeNull();
  });
});

describe('criarPedidoManual com tipoAtendimento', () => {
  const clienteMock = { id: 'cli-1', telefone: '62999990001', nome: 'Cliente Teste', endereco: '', bairro: '', cep: null, origem: 'SITE', criadoEm: new Date(), atualizadoEm: new Date() };
  const produtoMock = { id: 'prod-1', nome: 'Produto', preco: 20, disponivel: true, categoria: null, descricao: null, imagemUrl: null, criadoEm: new Date(), atualizadoEm: new Date() };
  const pedidoCriado = {
    id: 'ped-manual-1',
    numeroPedido: 101,
    status: StatusPedido.CONFIRMADO,
    statusPagamento: StatusPagamento.A_RECEBER,
    tipoAtendimento: TipoAtendimentoPedido.RETIRADA,
    total: 20,
    taxaEntrega: 0,
    tokenAcesso: 'tok',
    itens: [{ id: 'item-1', produtoId: 'prod-1', quantidade: 1, precoUnitario: 20, observacao: null, produto: produtoMock }],
    cliente: clienteMock,
    pagamento: null,
    motoboy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FRONTEND_URL = 'https://rancho.delivery';
  });

  it('cria pedido manual RETIRADA sem taxaEntrega e sem validação de bairro', async () => {
    vi.mocked(clienteService.criarOuAtualizar).mockResolvedValue(clienteMock as any);
    vi.mocked(prisma.produto.findUnique).mockResolvedValue(produtoMock as any);
    vi.mocked(prisma.pedido.create).mockResolvedValue(pedidoCriado as any);
    vi.mocked(prisma.pedido.findUnique).mockResolvedValue({ ...pedidoCriado, enderecoEntrega: null } as any);
    vi.mocked(prisma.pedidoTimeline.create).mockResolvedValue({} as any);

    const resultado = await pedidoService.criarPedidoManual({
      cliente: { nome: 'Cliente Teste', telefone: '62999990001', endereco: '', bairro: '' },
      itens: [{ produtoId: 'prod-1', quantidade: 1 }],
      pagamentoMetodo: 'PIX',
      tipoAtendimento: TipoAtendimentoPedido.RETIRADA,
    });

    expect(resultado.tipoAtendimento).toBe(TipoAtendimentoPedido.RETIRADA);
    expect(vi.mocked(bairroService.validarBairro)).not.toHaveBeenCalled();
    const createCall = vi.mocked(prisma.pedido.create).mock.calls[0][0];
    expect((createCall.data as any).taxaEntrega).toBe(0);
  });

  it('cria pedido manual CONSUMO_LOCAL sem taxaEntrega', async () => {
    const pedidoLocal = { ...pedidoCriado, tipoAtendimento: TipoAtendimentoPedido.CONSUMO_LOCAL };
    vi.mocked(clienteService.criarOuAtualizar).mockResolvedValue(clienteMock as any);
    vi.mocked(prisma.produto.findUnique).mockResolvedValue(produtoMock as any);
    vi.mocked(prisma.pedido.create).mockResolvedValue(pedidoLocal as any);
    vi.mocked(prisma.pedido.findUnique).mockResolvedValue({ ...pedidoLocal, enderecoEntrega: null } as any);
    vi.mocked(prisma.pedidoTimeline.create).mockResolvedValue({} as any);

    const resultado = await pedidoService.criarPedidoManual({
      cliente: { nome: 'Cliente Teste', telefone: '62999990001', endereco: '', bairro: '' },
      itens: [{ produtoId: 'prod-1', quantidade: 1 }],
      pagamentoMetodo: 'DINHEIRO',
      tipoAtendimento: TipoAtendimentoPedido.CONSUMO_LOCAL,
    });

    expect(resultado.tipoAtendimento).toBe(TipoAtendimentoPedido.CONSUMO_LOCAL);
    expect(vi.mocked(bairroService.validarBairro)).not.toHaveBeenCalled();
  });
});

describe('listarPedidosAdmin — janela diária (BX-01)', () => {
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);

  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);

  const makeRawPedido = (id: string, status: StatusPedido, criadoEm: Date) => ({
    id,
    status,
    statusPagamento: StatusPagamento.A_RECEBER,
    formaPagamento: FormaPagamentoPedido.PIX,
    trocoPara: null,
    tipoAtendimento: TipoAtendimentoPedido.ENTREGA,
    motoboyId: null,
    total: 30,
    criadoEm,
    atualizadoEm: criadoEm,
    statusMudouEm: criadoEm,
    bairroEntrega: null,
    cliente: { nome: 'Test', telefone: '62999990000', bairro: 'Centro' },
    itens: [],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.mensagemCliente.groupBy).mockResolvedValue([] as any);
    vi.mocked(prisma.pedido.count).mockResolvedValue(1 as any);
  });

  it('em modo todos: retorna pedido ativo de ontem', async () => {
    const pedidoAtivo = makeRawPedido('p-ativo', StatusPedido.CONFIRMADO, ontem);
    vi.mocked(prisma.pedido.findMany).mockResolvedValue([pedidoAtivo] as any);

    const result = await pedidoService.listarPedidosAdmin();

    const whereArg = vi.mocked(prisma.pedido.findMany).mock.calls[0][0].where as any;
    // Deve usar OR com notIn para ativos
    expect(whereArg.OR).toBeDefined();
    expect(whereArg.OR[0].status.notIn).toContain(StatusPedido.ENTREGUE);
    expect(result.data[0].id).toBe('p-ativo');
  });

  it('em modo todos: retorna pedido ENTREGUE criado hoje', async () => {
    const pedidoHoje = makeRawPedido('p-hoje', StatusPedido.ENTREGUE, hoje);
    vi.mocked(prisma.pedido.findMany).mockResolvedValue([pedidoHoje] as any);

    const result = await pedidoService.listarPedidosAdmin();

    const whereArg = vi.mocked(prisma.pedido.findMany).mock.calls[0][0].where as any;
    // Deve incluir finais com criadoEm >= inicioDia
    expect(whereArg.OR[1].status.in).toContain(StatusPedido.ENTREGUE);
    expect(whereArg.OR[1].criadoEm.gte).toBeDefined();
    expect(result.data[0].id).toBe('p-hoje');
  });

  it('em modo todos: o filtro inicioDia tem horas zeradas (meia-noite)', async () => {
    vi.mocked(prisma.pedido.findMany).mockResolvedValue([] as any);

    await pedidoService.listarPedidosAdmin();

    const whereArg = vi.mocked(prisma.pedido.findMany).mock.calls[0][0].where as any;
    const inicioDia: Date = whereArg.OR[1].criadoEm.gte;
    // inicioDia é UTC; verificamos que representa meia-noite em São Paulo
    const spStr = inicioDia.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    // Aceita "00:00:00" ou "24:00:00" (ambos representam meia-noite)
    expect(spStr.replace(/^24:/, '00:')).toBe('00:00:00');
  });

  it('com status explícito: NÃO aplica janela diária', async () => {
    vi.mocked(prisma.pedido.findMany).mockResolvedValue([] as any);

    await pedidoService.listarPedidosAdmin({ status: 'ENTREGUE' });

    const whereArg = vi.mocked(prisma.pedido.findMany).mock.calls[0][0].where as any;
    // where.status deve ser setado diretamente, sem OR de janela
    expect(whereArg.status).toBe('ENTREGUE');
    expect(whereArg.OR).toBeUndefined();
  });

  it('com busca + modo todos: combina janela diária E busca via AND', async () => {
    vi.mocked(prisma.pedido.findMany).mockResolvedValue([] as any);

    await pedidoService.listarPedidosAdmin({ busca: 'João' });

    const whereArg = vi.mocked(prisma.pedido.findMany).mock.calls[0][0].where as any;
    // Deve usar AND para combinar janela e busca
    expect(whereArg.AND).toBeDefined();
    expect(whereArg.AND[0].OR[0].status.notIn).toBeDefined(); // janela
    expect(whereArg.AND[1].OR[0].id.contains).toBe('João');  // busca
  });

  it('com status explícito + busca: usa OR simples de busca sem janela', async () => {
    vi.mocked(prisma.pedido.findMany).mockResolvedValue([] as any);

    await pedidoService.listarPedidosAdmin({ status: 'CONFIRMADO', busca: 'Maria' });

    const whereArg = vi.mocked(prisma.pedido.findMany).mock.calls[0][0].where as any;
    expect(whereArg.status).toBe('CONFIRMADO');
    expect(whereArg.OR[0].id.contains).toBe('Maria');
    expect(whereArg.AND).toBeUndefined();
  });
});
