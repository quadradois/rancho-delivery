import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import adminClienteController from '../../controllers/admin.cliente.controller';
import evolutionService from '../../services/evolution.service';
import prisma from '../../config/database';

vi.mock('../../services/cliente.service', () => ({
  default: {
    criarManual: vi.fn(),
    listarClientesGestao: vi.fn(),
    obterMetricasClientesGestao: vi.fn(),
    buscarClienteParaPedidoManual: vi.fn(),
    listarTodasConversas: vi.fn(),
    listarConversasNaoLidas: vi.fn(),
    listarMensagens: vi.fn(),
    listarMensagensLead: vi.fn(),
    enviarMensagemHumana: vi.fn(),
    obterStatusWhatsApp: vi.fn(),
    prepararConexaoWhatsApp: vi.fn(),
    atualizarQrCodeWhatsApp: vi.fn(),
    obterResumoCliente: vi.fn(),
    adicionarListaNegra: vi.fn(),
    removerListaNegra: vi.fn(),
    atualizarAtivo: vi.fn(),
    excluir: vi.fn(),
    atualizarNivelListaNegra: vi.fn(),
    listarOcorrencias: vi.fn(),
  },
}));

vi.mock('../../services/evolution.service', () => ({
  default: {
    obterDetalhesInstancia: vi.fn(),
    obterConfigInstancia: vi.fn(),
    garantirInstanciaEObterQrCode: vi.fn(),
    desconectarInstancia: vi.fn(),
    apagarInstancia: vi.fn(),
    atualizarConfigInstancia: vi.fn(),
  },
}));

function makeReq(options: { body?: object; params?: Record<string, string> } = {}): Partial<Request> {
  return { body: options.body || {}, params: options.params || {}, query: {} } as any;
}

function makeRes(): { res: Partial<Response>; json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const res: Partial<Response> = { json } as any;
  const status = vi.fn().mockReturnValue(res);
  res.status = status as any;
  return { res, json, status };
}

describe('AdminClienteController — conexões WhatsApp', () => {
  const conexaoWhatsApp = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as any).conexaoWhatsApp = conexaoWhatsApp;
    (prisma as any).$transaction = vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops));
  });

  it('lista conexões enriquecendo com status ao vivo da Evolution', async () => {
    const conexao = {
      id: 'conn-1',
      nome: 'rancho-comida',
      principal: true,
      conectado: false,
      telefone: null,
    };
    conexaoWhatsApp.findMany.mockResolvedValue([conexao]);
    vi.mocked(evolutionService.obterDetalhesInstancia).mockResolvedValue({
      conectado: true,
      telefone: '5562999990000',
      state: 'open',
    } as any);

    const { res, json } = makeRes();
    await adminClienteController.listarConexoesWhatsApp(makeReq() as Request, res as Response);

    expect(conexaoWhatsApp.findMany).toHaveBeenCalledWith({
      orderBy: [{ principal: 'desc' }, { criadoEm: 'asc' }],
    });
    expect(evolutionService.obterDetalhesInstancia).toHaveBeenCalledWith('rancho-comida');
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: [{ ...conexao, conectado: true, telefone: '5562999990000', state: 'open' }],
    });
  });

  it('lista conexões usando dados locais quando a Evolution não responde', async () => {
    const conexao = {
      id: 'conn-1',
      nome: 'rancho-comida',
      principal: true,
      conectado: false,
      telefone: '5562888880000',
    };
    conexaoWhatsApp.findMany.mockResolvedValue([conexao]);
    vi.mocked(evolutionService.obterDetalhesInstancia).mockRejectedValue(new Error('offline'));

    const { res, json } = makeRes();
    await adminClienteController.listarConexoesWhatsApp(makeReq() as Request, res as Response);

    expect(json).toHaveBeenCalledWith({
      success: true,
      data: [{ ...conexao, conectado: false, telefone: '5562888880000', state: 'desconhecido' }],
    });
  });

  it('cria conexão válida, marca a primeira como principal e retorna QR', async () => {
    const conexao = { id: 'conn-1', nome: 'rancho-comida', principal: true };
    conexaoWhatsApp.findUnique.mockResolvedValue(null);
    conexaoWhatsApp.count.mockResolvedValue(0);
    conexaoWhatsApp.create.mockResolvedValue(conexao);
    vi.mocked(evolutionService.garantirInstanciaEObterQrCode).mockResolvedValue({
      conectado: false,
      qrCodeBase64: 'data:image/png;base64,abc',
    } as any);

    const { res, json, status } = makeRes();
    await adminClienteController.criarConexaoWhatsApp(
      makeReq({ body: { nome: ' rancho-comida ' } }) as Request,
      res as Response,
    );

    expect(conexaoWhatsApp.create).toHaveBeenCalledWith({
      data: { nome: 'rancho-comida', principal: true },
    });
    expect(evolutionService.garantirInstanciaEObterQrCode).toHaveBeenCalledWith('rancho-comida');
    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: { conexao, conectado: false, qrCodeBase64: 'data:image/png;base64,abc' },
    });
  });

  it('retorna conflito ao criar conexão com nome já cadastrado', async () => {
    conexaoWhatsApp.findUnique.mockResolvedValue({ id: 'conn-1', nome: 'rancho-comida' });

    const { res, json, status } = makeRes();
    await adminClienteController.criarConexaoWhatsApp(
      makeReq({ body: { nome: 'rancho-comida' } }) as Request,
      res as Response,
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: { message: 'Já existe uma conexão com esse nome' },
    });
    expect(conexaoWhatsApp.create).not.toHaveBeenCalled();
  });

  it('rejeita criação com nome inválido', async () => {
    const { res, json, status } = makeRes();

    await adminClienteController.criarConexaoWhatsApp(
      makeReq({ body: { nome: 'rancho comida!' } }) as Request,
      res as Response,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: { message: 'nome inválido (use 3-100 caracteres: letras, números, _ e -)' },
    });
    expect(conexaoWhatsApp.create).not.toHaveBeenCalled();
  });

  it('gera QR Code e persiste estado conectado', async () => {
    vi.mocked(evolutionService.garantirInstanciaEObterQrCode).mockResolvedValue({
      conectado: false,
      qrCodeBase64: 'qr',
    } as any);
    conexaoWhatsApp.update.mockResolvedValue({});

    const { res, json } = makeRes();
    await adminClienteController.qrcodeConexaoWhatsApp(
      makeReq({ params: { nome: 'rancho-comida' } }) as Request,
      res as Response,
    );

    expect(conexaoWhatsApp.update).toHaveBeenCalledWith({
      where: { nome: 'rancho-comida' },
      data: { conectado: false },
    });
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: { conectado: false, qrCodeBase64: 'qr' },
    });
  });

  it('retorna detalhes da conexão com configurações e atualiza cache local', async () => {
    vi.mocked(evolutionService.obterDetalhesInstancia).mockResolvedValue({
      conectado: true,
      telefone: '5562999990000',
      instanceName: 'rancho-comida',
    } as any);
    vi.mocked(evolutionService.obterConfigInstancia).mockResolvedValue({ alwaysOnline: true });
    conexaoWhatsApp.update.mockResolvedValue({});

    const { res, json } = makeRes();
    await adminClienteController.detalhesConexaoWhatsApp(
      makeReq({ params: { nome: 'rancho-comida' } }) as Request,
      res as Response,
    );

    expect(evolutionService.obterConfigInstancia).toHaveBeenCalledWith('rancho-comida');
    expect(conexaoWhatsApp.update).toHaveBeenCalledWith({
      where: { nome: 'rancho-comida' },
      data: { conectado: true, telefone: '5562999990000' },
    });
    expect(json).toHaveBeenCalledWith({
      success: true,
      data: {
        conectado: true,
        telefone: '5562999990000',
        instanceName: 'rancho-comida',
        configs: { alwaysOnline: true },
      },
    });
  });

  it('desconecta a conexão e responde 502 quando a Evolution falha', async () => {
    vi.mocked(evolutionService.desconectarInstancia).mockResolvedValue(false);
    conexaoWhatsApp.update.mockResolvedValue({});

    const { res, json, status } = makeRes();
    await adminClienteController.desconectarConexaoWhatsApp(
      makeReq({ params: { nome: 'rancho-comida' } }) as Request,
      res as Response,
    );

    expect(conexaoWhatsApp.update).toHaveBeenCalledWith({
      where: { nome: 'rancho-comida' },
      data: { conectado: false },
    });
    expect(status).toHaveBeenCalledWith(502);
    expect(json).toHaveBeenCalledWith({ success: false, error: { message: 'Falha ao desconectar' } });
  });

  it('apaga conexão principal e promove a próxima', async () => {
    conexaoWhatsApp.findUnique.mockResolvedValue({ id: 'conn-1', nome: 'rancho-comida', principal: true });
    conexaoWhatsApp.delete.mockResolvedValue({});
    conexaoWhatsApp.findFirst.mockResolvedValue({ id: 'conn-2', nome: 'rancho-reserva' });
    conexaoWhatsApp.update.mockResolvedValue({});
    vi.mocked(evolutionService.apagarInstancia).mockResolvedValue(true);

    const { res, json } = makeRes();
    await adminClienteController.apagarConexaoWhatsApp(
      makeReq({ params: { nome: 'rancho-comida' } }) as Request,
      res as Response,
    );

    expect(evolutionService.apagarInstancia).toHaveBeenCalledWith('rancho-comida');
    expect(conexaoWhatsApp.delete).toHaveBeenCalledWith({ where: { nome: 'rancho-comida' } });
    expect(conexaoWhatsApp.update).toHaveBeenCalledWith({
      where: { id: 'conn-2' },
      data: { principal: true },
    });
    expect(json).toHaveBeenCalledWith({ success: true, data: { apagado: true } });
  });

  it('retorna 404 ao apagar conexão inexistente', async () => {
    conexaoWhatsApp.findUnique.mockResolvedValue(null);

    const { res, json, status } = makeRes();
    await adminClienteController.apagarConexaoWhatsApp(
      makeReq({ params: { nome: 'inexistente' } }) as Request,
      res as Response,
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ success: false, error: { message: 'Conexão não encontrada' } });
    expect(conexaoWhatsApp.delete).not.toHaveBeenCalled();
  });

  it('define uma conexão como principal dentro de transação', async () => {
    conexaoWhatsApp.findUnique.mockResolvedValue({ id: 'conn-1', nome: 'rancho-comida' });
    conexaoWhatsApp.updateMany.mockResolvedValue({ count: 1 });
    conexaoWhatsApp.update.mockResolvedValue({});

    const { res, json } = makeRes();
    await adminClienteController.definirPrincipalWhatsApp(
      makeReq({ params: { nome: 'rancho-comida' } }) as Request,
      res as Response,
    );

    expect(conexaoWhatsApp.updateMany).toHaveBeenCalledWith({
      where: { principal: true },
      data: { principal: false },
    });
    expect(conexaoWhatsApp.update).toHaveBeenCalledWith({
      where: { nome: 'rancho-comida' },
      data: { principal: true },
    });
    expect(json).toHaveBeenCalledWith({ success: true, data: { nome: 'rancho-comida', principal: true } });
  });

  it('atualiza configurações da conexão na Evolution', async () => {
    vi.mocked(evolutionService.atualizarConfigInstancia).mockResolvedValue(true);
    const configs = { alwaysOnline: true, readMessages: false };

    const { res, json } = makeRes();
    await adminClienteController.configConexaoWhatsApp(
      makeReq({ params: { nome: 'rancho-comida' }, body: configs }) as Request,
      res as Response,
    );

    expect(evolutionService.atualizarConfigInstancia).toHaveBeenCalledWith(configs, 'rancho-comida');
    expect(json).toHaveBeenCalledWith({ success: true, data: { atualizado: true, configs } });
  });
});
