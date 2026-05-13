import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import adminPedidoController from '../../controllers/admin.pedido.controller';
import pedidoService from '../../services/pedido.service';
import realtimeService from '../../services/realtime.service';

vi.mock('../../services/pedido.service');
vi.mock('../../services/realtime.service');
vi.mock('../../config/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

const mockPedido = { id: 'ped-1', status: 'CONFIRMADO', total: 50 };
const mockMetricas = { total: 5, receita: 250 };

function mockRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status, json } as unknown as Response, json, status };
}

function mockReq(overrides: Partial<Request> = {}): Request {
  return { body: {}, params: {}, query: {}, ...overrides } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(realtimeService.emit).mockReturnValue(undefined as any);
  vi.mocked(pedidoService.sincronizarExpiracoesCheckout).mockResolvedValue(undefined as any);
  vi.mocked(pedidoService.obterMetricasAdmin).mockResolvedValue(mockMetricas as any);
});

// ─── filaUrgente ────────────────────────────────────────────────────────────

describe('filaUrgente', () => {
  it('retorna fila com sucesso', async () => {
    vi.mocked(pedidoService.obterFilaUrgente).mockResolvedValue([mockPedido] as any);
    const { res, json } = mockRes();
    await adminPedidoController.filaUrgente(mockReq(), res);
    expect(json).toHaveBeenCalledWith({ success: true, data: [mockPedido] });
  });

  it('retorna 500 em caso de erro', async () => {
    vi.mocked(pedidoService.obterFilaUrgente).mockRejectedValue(new Error('db error'));
    const { res, status } = mockRes();
    await adminPedidoController.filaUrgente(mockReq(), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});

// ─── metricas ───────────────────────────────────────────────────────────────

describe('metricas', () => {
  it('retorna métricas com sucesso', async () => {
    const { res, json } = mockRes();
    await adminPedidoController.metricas(mockReq(), res);
    expect(json).toHaveBeenCalledWith({ success: true, data: mockMetricas });
  });

  it('retorna 500 em caso de erro', async () => {
    vi.mocked(pedidoService.obterMetricasAdmin).mockRejectedValue(new Error('falha'));
    const { res, status } = mockRes();
    await adminPedidoController.metricas(mockReq(), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});

// ─── listar ─────────────────────────────────────────────────────────────────

describe('listar', () => {
  it('lista pedidos com filtros', async () => {
    vi.mocked(pedidoService.listarPedidosAdmin).mockResolvedValue({ pedidos: [mockPedido], total: 1 } as any);
    const req = mockReq({ query: { status: 'CONFIRMADO', busca: 'João', page: '1', limit: '10' } });
    const { res, json } = mockRes();
    await adminPedidoController.listar(req, res);
    expect(pedidoService.listarPedidosAdmin).toHaveBeenCalledWith({
      status: 'CONFIRMADO',
      busca: 'João',
      page: 1,
      limit: 10,
    });
    expect(json).toHaveBeenCalledWith({ success: true, data: { pedidos: [mockPedido], total: 1 } });
  });

  it('retorna 500 em caso de erro', async () => {
    vi.mocked(pedidoService.listarPedidosAdmin).mockRejectedValue(new Error('db'));
    const { res, status } = mockRes();
    await adminPedidoController.listar(mockReq(), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});

// ─── buscarPorId ─────────────────────────────────────────────────────────────

describe('buscarPorId', () => {
  it('retorna pedido encontrado', async () => {
    vi.mocked(pedidoService.buscarPedidoAdminPorId).mockResolvedValue(mockPedido as any);
    const { res, json } = mockRes();
    await adminPedidoController.buscarPorId(mockReq({ params: { id: 'ped-1' } }), res);
    expect(json).toHaveBeenCalledWith({ success: true, data: mockPedido });
  });

  it('retorna 404 quando pedido não existe', async () => {
    vi.mocked(pedidoService.buscarPedidoAdminPorId).mockResolvedValue(null as any);
    const { res, status, json } = mockRes();
    await adminPedidoController.buscarPorId(mockReq({ params: { id: 'nao-existe' } }), res);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('retorna 500 em caso de erro', async () => {
    vi.mocked(pedidoService.buscarPedidoAdminPorId).mockRejectedValue(new Error('db'));
    const { res, status } = mockRes();
    await adminPedidoController.buscarPorId(mockReq({ params: { id: 'ped-1' } }), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});

// ─── atualizarStatus ────────────────────────────────────────────────────────

describe('atualizarStatus', () => {
  it('atualiza status com sucesso', async () => {
    vi.mocked(pedidoService.atualizarStatusAdmin).mockResolvedValue({ ...mockPedido, status: 'PREPARANDO' } as any);
    const req = mockReq({ params: { id: 'ped-1' }, body: { status: 'PREPARANDO' } });
    const { res, json } = mockRes();
    await adminPedidoController.atualizarStatus(req, res);
    expect(pedidoService.atualizarStatusAdmin).toHaveBeenCalledWith('ped-1', 'PREPARANDO', undefined, undefined);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(realtimeService.emit).toHaveBeenCalledWith('pedido:atualizado', expect.any(Object));
  });

  it('retorna 400 para status inválido', async () => {
    const req = mockReq({ params: { id: 'ped-1' }, body: { status: 'INVALIDO' } });
    const { res, status } = mockRes();
    await adminPedidoController.atualizarStatus(req, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(pedidoService.atualizarStatusAdmin).not.toHaveBeenCalled();
  });

  it('retorna 404 quando pedido não encontrado', async () => {
    vi.mocked(pedidoService.atualizarStatusAdmin).mockRejectedValue(new Error('PEDIDO_NAO_ENCONTRADO'));
    const req = mockReq({ params: { id: 'x' }, body: { status: 'PREPARANDO' } });
    const { res, status } = mockRes();
    await adminPedidoController.atualizarStatus(req, res);
    expect(status).toHaveBeenCalledWith(404);
  });

  it('retorna 400 para transição inválida', async () => {
    vi.mocked(pedidoService.atualizarStatusAdmin).mockRejectedValue(new Error('TRANSICAO_INVALIDA'));
    const req = mockReq({ params: { id: 'ped-1' }, body: { status: 'PENDENTE' } });
    const { res, status } = mockRes();
    await adminPedidoController.atualizarStatus(req, res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('passa motivo de cancelamento quando fornecido', async () => {
    vi.mocked(pedidoService.atualizarStatusAdmin).mockResolvedValue({ ...mockPedido, status: 'CANCELADO' } as any);
    const req = mockReq({ params: { id: 'ped-1' }, body: { status: 'CANCELADO', motivoCancelamento: 'Cliente desistiu' } });
    const { res } = mockRes();
    await adminPedidoController.atualizarStatus(req, res);
    expect(pedidoService.atualizarStatusAdmin).toHaveBeenCalledWith('ped-1', 'CANCELADO', 'Cliente desistiu', undefined);
  });
});

// ─── atribuirMotoboy ────────────────────────────────────────────────────────

describe('atribuirMotoboy', () => {
  it('atribui motoboy com sucesso', async () => {
    const resultado = { ...mockPedido, motoboy: { id: 'mb-1' } };
    vi.mocked(pedidoService.atribuirMotoboy).mockResolvedValue(resultado as any);
    const req = mockReq({ params: { id: 'ped-1' }, body: { motoboyId: 'mb-1' } });
    const { res, json } = mockRes();
    await adminPedidoController.atribuirMotoboy(req, res);
    expect(json).toHaveBeenCalledWith({ success: true, data: resultado });
    expect(realtimeService.emit).toHaveBeenCalledWith('pedido:atualizado', expect.any(Object));
  });

  it('retorna 404 para pedido não encontrado', async () => {
    vi.mocked(pedidoService.atribuirMotoboy).mockRejectedValue(new Error('PEDIDO_NAO_ENCONTRADO'));
    const { res, status } = mockRes();
    await adminPedidoController.atribuirMotoboy(mockReq({ params: { id: 'x' }, body: { motoboyId: 'mb-1' } }), res);
    expect(status).toHaveBeenCalledWith(404);
  });

  it('retorna 404 para motoboy não encontrado', async () => {
    vi.mocked(pedidoService.atribuirMotoboy).mockRejectedValue(new Error('MOTOBOY_NAO_ENCONTRADO'));
    const { res, status } = mockRes();
    await adminPedidoController.atribuirMotoboy(mockReq({ params: { id: 'ped-1' }, body: { motoboyId: 'x' } }), res);
    expect(status).toHaveBeenCalledWith(404);
  });

  it('remove motoboy quando motoboyId não informado', async () => {
    vi.mocked(pedidoService.atribuirMotoboy).mockResolvedValue({ ...mockPedido, motoboy: null } as any);
    const req = mockReq({ params: { id: 'ped-1' }, body: {} });
    const { res } = mockRes();
    await adminPedidoController.atribuirMotoboy(req, res);
    expect(pedidoService.atribuirMotoboy).toHaveBeenCalledWith('ped-1', null, undefined, undefined);
  });
});

// ─── atualizarEnderecoEntrega ────────────────────────────────────────────────

describe('atualizarEnderecoEntrega', () => {
  it('atualiza endereço com sucesso', async () => {
    vi.mocked(pedidoService.atualizarEnderecoEntrega).mockResolvedValue(mockPedido as any);
    const req = mockReq({ params: { id: 'ped-1' }, body: { endereco: 'Rua A, 10', bairro: 'Setor Sul' } });
    const { res, json } = mockRes();
    await adminPedidoController.atualizarEnderecoEntrega(req, res);
    expect(json).toHaveBeenCalledWith({ success: true, data: mockPedido });
  });

  it('retorna 400 quando endereço está vazio', async () => {
    const req = mockReq({ params: { id: 'ped-1' }, body: { endereco: '', bairro: 'Setor Sul' } });
    const { res, status } = mockRes();
    await adminPedidoController.atualizarEnderecoEntrega(req, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(pedidoService.atualizarEnderecoEntrega).not.toHaveBeenCalled();
  });

  it('retorna 400 quando bairro está vazio', async () => {
    const req = mockReq({ params: { id: 'ped-1' }, body: { endereco: 'Rua A', bairro: '' } });
    const { res, status } = mockRes();
    await adminPedidoController.atualizarEnderecoEntrega(req, res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 para pedido não encontrado', async () => {
    vi.mocked(pedidoService.atualizarEnderecoEntrega).mockRejectedValue(new Error('PEDIDO_NAO_ENCONTRADO'));
    const req = mockReq({ params: { id: 'x' }, body: { endereco: 'Rua A', bairro: 'Setor Sul' } });
    const { res, status } = mockRes();
    await adminPedidoController.atualizarEnderecoEntrega(req, res);
    expect(status).toHaveBeenCalledWith(404);
  });

  it('retorna 400 para bairro não atendido', async () => {
    vi.mocked(pedidoService.atualizarEnderecoEntrega).mockRejectedValue(new Error('BAIRRO_NAO_ATENDIDO'));
    const req = mockReq({ params: { id: 'ped-1' }, body: { endereco: 'Rua A', bairro: 'Bairro Distante' } });
    const { res, status } = mockRes();
    await adminPedidoController.atualizarEnderecoEntrega(req, res);
    expect(status).toHaveBeenCalledWith(400);
  });
});

// ─── criarManual ────────────────────────────────────────────────────────────

describe('criarManual', () => {
  const clienteBase = { nome: 'João', telefone: '62999990000', endereco: 'Rua A', bairro: 'Centro' };

  it('cria pedido manual PIX com sucesso', async () => {
    vi.mocked(pedidoService.criarPedidoManual).mockResolvedValue({ ...mockPedido, status: 'AGUARDANDO_PAGAMENTO', linkPagamento: 'http://pay' } as any);
    const req = mockReq({ body: { pagamentoMetodo: 'PIX', cliente: clienteBase, itens: [{ produtoId: 'p1', quantidade: 1 }] } });
    const { res, status, json } = mockRes();
    await adminPedidoController.criarManual(req, res);
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(realtimeService.emit).toHaveBeenCalledWith('pedido:novo', expect.any(Object));
  });

  it('cria pedido manual DINHEIRO com sucesso', async () => {
    vi.mocked(pedidoService.criarPedidoManual).mockResolvedValue({ ...mockPedido, status: 'CONFIRMADO' } as any);
    const req = mockReq({ body: { pagamentoMetodo: 'DINHEIRO', valorDinheiro: 50, cliente: clienteBase, itens: [{ produtoId: 'p1', quantidade: 1 }] } });
    const { res, status } = mockRes();
    await adminPedidoController.criarManual(req, res);
    expect(status).toHaveBeenCalledWith(201);
  });

  it('retorna 400 para método de pagamento inválido', async () => {
    const req = mockReq({ body: { pagamentoMetodo: 'CRYPTO' } });
    const { res, status } = mockRes();
    await adminPedidoController.criarManual(req, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(pedidoService.criarPedidoManual).not.toHaveBeenCalled();
  });

  it('retorna 400 quando service lança erro de validação', async () => {
    vi.mocked(pedidoService.criarPedidoManual).mockRejectedValue(new Error('Bairro não atendido'));
    const req = mockReq({ body: { pagamentoMetodo: 'PIX', cliente: clienteBase, itens: [] } });
    const { res, status, json } = mockRes();
    await adminPedidoController.criarManual(req, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

// ─── cancelar ───────────────────────────────────────────────────────────────

describe('cancelar', () => {
  it('cancela pedido com sucesso', async () => {
    vi.mocked(pedidoService.cancelarPedidoAdmin).mockResolvedValue({ ...mockPedido, status: 'CANCELADO' } as any);
    const req = mockReq({ params: { id: 'ped-1' }, body: { motivo: 'Cliente desistiu' } });
    const { res, json } = mockRes();
    await adminPedidoController.cancelar(req, res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(realtimeService.emit).toHaveBeenCalledWith('pedido:atualizado', expect.any(Object));
  });

  it('retorna 400 quando motivo está vazio', async () => {
    const req = mockReq({ params: { id: 'ped-1' }, body: { motivo: '' } });
    const { res, status } = mockRes();
    await adminPedidoController.cancelar(req, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(pedidoService.cancelarPedidoAdmin).not.toHaveBeenCalled();
  });

  it('retorna 400 quando motivo não informado', async () => {
    const req = mockReq({ params: { id: 'ped-1' }, body: {} });
    const { res, status } = mockRes();
    await adminPedidoController.cancelar(req, res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('retorna 404 para pedido não encontrado', async () => {
    vi.mocked(pedidoService.cancelarPedidoAdmin).mockRejectedValue(new Error('PEDIDO_NAO_ENCONTRADO'));
    const req = mockReq({ params: { id: 'x' }, body: { motivo: 'Motivo' } });
    const { res, status } = mockRes();
    await adminPedidoController.cancelar(req, res);
    expect(status).toHaveBeenCalledWith(404);
  });
});

// ─── marcarEstorno ──────────────────────────────────────────────────────────

describe('marcarEstorno', () => {
  it('marca estorno com sucesso', async () => {
    vi.mocked(pedidoService.marcarEstornoAdmin).mockResolvedValue({ ...mockPedido, estornoNecessario: false } as any);
    const { res, json } = mockRes();
    await adminPedidoController.marcarEstorno(mockReq({ params: { id: 'ped-1' } }), res);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(realtimeService.emit).toHaveBeenCalledWith('pedido:atualizado', expect.objectContaining({ estorno: true }));
  });

  it('retorna 404 para pedido não encontrado', async () => {
    vi.mocked(pedidoService.marcarEstornoAdmin).mockRejectedValue(new Error('PEDIDO_NAO_ENCONTRADO'));
    const { res, status } = mockRes();
    await adminPedidoController.marcarEstorno(mockReq({ params: { id: 'x' } }), res);
    expect(status).toHaveBeenCalledWith(404);
  });

  it('retorna 400 quando estorno não é necessário', async () => {
    vi.mocked(pedidoService.marcarEstornoAdmin).mockRejectedValue(new Error('ESTORNO_NAO_NECESSARIO'));
    const { res, status } = mockRes();
    await adminPedidoController.marcarEstorno(mockReq({ params: { id: 'ped-1' } }), res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('retorna 400 para status inválido de estorno', async () => {
    vi.mocked(pedidoService.marcarEstornoAdmin).mockRejectedValue(new Error('ESTORNO_STATUS_INVALIDO'));
    const { res, status } = mockRes();
    await adminPedidoController.marcarEstorno(mockReq({ params: { id: 'ped-1' } }), res);
    expect(status).toHaveBeenCalledWith(400);
  });
});

// ─── obterStatusLoja ────────────────────────────────────────────────────────

describe('obterStatusLoja', () => {
  it('retorna status da loja', async () => {
    const loja = { status: 'ABERTO', mensagem: null };
    vi.mocked(pedidoService.obterStatusLoja).mockResolvedValue(loja as any);
    const { res, json } = mockRes();
    await adminPedidoController.obterStatusLoja(mockReq(), res);
    expect(json).toHaveBeenCalledWith({ success: true, data: loja });
  });

  it('retorna 500 em caso de erro', async () => {
    vi.mocked(pedidoService.obterStatusLoja).mockRejectedValue(new Error('db'));
    const { res, status } = mockRes();
    await adminPedidoController.obterStatusLoja(mockReq(), res);
    expect(status).toHaveBeenCalledWith(500);
  });
});

// ─── atualizarStatusLoja ────────────────────────────────────────────────────

describe('atualizarStatusLoja', () => {
  it('abre a loja com sucesso', async () => {
    const loja = { status: 'ABERTO' };
    vi.mocked(pedidoService.atualizarStatusLoja).mockResolvedValue(loja as any);
    const req = mockReq({ body: { status: 'ABERTO' } });
    const { res, json } = mockRes();
    await adminPedidoController.atualizarStatusLoja(req, res);
    expect(json).toHaveBeenCalledWith({ success: true, data: loja });
    expect(realtimeService.emit).toHaveBeenCalledWith('loja:status', loja);
  });

  it('pausa loja com mensagem', async () => {
    vi.mocked(pedidoService.atualizarStatusLoja).mockResolvedValue({ status: 'PAUSADO' } as any);
    const req = mockReq({ body: { status: 'PAUSADO', mensagem: 'Voltamos em 30min' } });
    const { res } = mockRes();
    await adminPedidoController.atualizarStatusLoja(req, res);
    expect(pedidoService.atualizarStatusLoja).toHaveBeenCalledWith('PAUSADO', 'Voltamos em 30min', undefined);
  });

  it('retorna 400 para status de loja inválido', async () => {
    const req = mockReq({ body: { status: 'OCUPADO' } });
    const { res, status } = mockRes();
    await adminPedidoController.atualizarStatusLoja(req, res);
    expect(status).toHaveBeenCalledWith(400);
    expect(pedidoService.atualizarStatusLoja).not.toHaveBeenCalled();
  });

  it('retorna 400 quando mensagem é obrigatória (PAUSADO)', async () => {
    vi.mocked(pedidoService.atualizarStatusLoja).mockRejectedValue(new Error('MENSAGEM_PAUSADO_OBRIGATORIA'));
    const req = mockReq({ body: { status: 'PAUSADO' } });
    const { res, status } = mockRes();
    await adminPedidoController.atualizarStatusLoja(req, res);
    expect(status).toHaveBeenCalledWith(400);
  });

  it('retorna 500 em caso de erro genérico', async () => {
    vi.mocked(pedidoService.atualizarStatusLoja).mockRejectedValue(new Error('db'));
    const req = mockReq({ body: { status: 'FECHADO' } });
    const { res, status } = mockRes();
    await adminPedidoController.atualizarStatusLoja(req, res);
    expect(status).toHaveBeenCalledWith(500);
  });
});
