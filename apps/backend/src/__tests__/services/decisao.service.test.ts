import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AcaoRecomendada,
  SeveridadeAlerta,
  StatusAlerta,
  StatusPagamento,
  StatusPedido,
  TipoAlertaOperacional,
} from '@prisma/client';
import decisaoService from '../../services/decisao.service';
import prisma from '../../config/database';

describe('DecisaoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.alertaOperacional.findMany).mockResolvedValue([]);
    vi.mocked(prisma.alertaOperacional.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.pedidoTimeline.create).mockResolvedValue({} as any);
  });

  it('cria alerta critico para pedido pago sem confirmacao', async () => {
    vi.mocked(prisma.pedido.findUnique).mockResolvedValue({
      id: 'pedido-123456',
      status: StatusPedido.AGUARDANDO_PAGAMENTO,
      statusPagamento: StatusPagamento.CONFIRMADO,
      statusMudouEm: new Date(Date.now() - 90_000),
      criadoEm: new Date(Date.now() - 120_000),
      total: 50,
      motoboyId: null,
      estornoNecessario: false,
      estornoRealizadoEm: null,
      clienteTelefone: '5562999999999',
      bairroEntrega: 'Centro',
      cliente: {
        nome: 'Maria',
        telefone: '5562999999999',
        bairro: 'Centro',
      },
    } as any);
    vi.mocked(prisma.alertaOperacional.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.alertaOperacional.create).mockResolvedValue({
      id: 'alerta-1',
      tipo: TipoAlertaOperacional.PEDIDO_PAGO_SEM_CONFIRMACAO,
      severidade: SeveridadeAlerta.CRITICO,
      status: StatusAlerta.ABERTO,
      pedidoId: 'pedido-123456',
      clienteTelefone: '5562999999999',
      titulo: 'Pedido pago aguardando confirmacao',
      descricao: '',
      motivo: '',
      proximaAcao: AcaoRecomendada.CONFIRMAR_PEDIDO,
      acaoPayload: null,
      dedupeKey: 'PEDIDO_PAGO_SEM_CONFIRMACAO:pedido-123456',
      detectadoEm: new Date(),
      resolvidoEm: null,
      resolvidoPor: null,
      resolucaoMotivo: null,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    } as any);
    vi.mocked(prisma.pedidoTimeline.create).mockResolvedValue({} as any);

    const resultado = await decisaoService.avaliarPedido('pedido-123456');

    expect(resultado.criados).toBe(1);
    expect(prisma.alertaOperacional.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tipo: TipoAlertaOperacional.PEDIDO_PAGO_SEM_CONFIRMACAO,
        severidade: SeveridadeAlerta.CRITICO,
        proximaAcao: AcaoRecomendada.CONFIRMAR_PEDIDO,
        dedupeKey: 'PEDIDO_PAGO_SEM_CONFIRMACAO:pedido-123456',
      }),
    }));
  });

  it('resolve alerta de pagamento quando pedido ja foi confirmado', async () => {
    vi.mocked(prisma.pedido.findUnique).mockResolvedValue({
      id: 'pedido-123456',
      status: StatusPedido.CONFIRMADO,
      statusPagamento: StatusPagamento.CONFIRMADO,
      statusMudouEm: new Date(),
      criadoEm: new Date(),
      total: 50,
      motoboyId: null,
      estornoNecessario: false,
      estornoRealizadoEm: null,
      clienteTelefone: '5562999999999',
      bairroEntrega: 'Centro',
      cliente: {
        nome: 'Maria',
        telefone: '5562999999999',
        bairro: 'Centro',
      },
    } as any);
    vi.mocked(prisma.alertaOperacional.findFirst).mockResolvedValueOnce({
      id: 'alerta-1',
      dedupeKey: 'PEDIDO_PAGO_SEM_CONFIRMACAO:pedido-123456',
      status: StatusAlerta.ABERTO,
      pedidoId: 'pedido-123456',
    } as any).mockResolvedValue(null);
    vi.mocked(prisma.alertaOperacional.update).mockResolvedValue({
      id: 'alerta-1',
      status: StatusAlerta.RESOLVIDO,
      pedidoId: 'pedido-123456',
      clienteTelefone: '5562999999999',
    } as any);
    vi.mocked(prisma.pedidoTimeline.create).mockResolvedValue({} as any);

    const resultado = await decisaoService.avaliarPedido('pedido-123456');

    expect(resultado.resolvidos).toBe(1);
    expect(prisma.alertaOperacional.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: StatusAlerta.RESOLVIDO,
      }),
    }));
  });

  it('cria alerta para cliente com mensagem sem resposta acima do SLA', async () => {
    vi.mocked(prisma.mensagemCliente.findFirst).mockResolvedValue({
      id: 'msg-1',
      clienteTelefone: '5562888888888',
      pedidoId: null,
      origem: 'HUMANO',
      texto: 'Meu pedido vai demorar?',
      lida: false,
      criadoEm: new Date(Date.now() - 180_000),
    } as any);
    vi.mocked(prisma.pedido.findFirst).mockResolvedValue({
      id: 'pedido-ativo',
      status: StatusPedido.PREPARANDO,
    } as any);
    vi.mocked(prisma.alertaOperacional.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.alertaOperacional.create).mockResolvedValue({
      id: 'alerta-msg',
      tipo: TipoAlertaOperacional.CLIENTE_SEM_RESPOSTA,
      severidade: SeveridadeAlerta.ATENCAO,
      status: StatusAlerta.ABERTO,
      pedidoId: 'pedido-ativo',
      clienteTelefone: '5562888888888',
      titulo: 'Cliente aguardando resposta',
      descricao: '',
      motivo: '',
      proximaAcao: AcaoRecomendada.RESPONDER_CLIENTE,
      acaoPayload: null,
      dedupeKey: 'CLIENTE_SEM_RESPOSTA:5562888888888:pedido-ativo:msg-1',
      detectadoEm: new Date(),
      resolvidoEm: null,
      resolvidoPor: null,
      resolucaoMotivo: null,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    } as any);
    vi.mocked(prisma.pedidoTimeline.create).mockResolvedValue({} as any);

    const resultado = await decisaoService.avaliarMensagensCliente('5562888888888');

    expect(resultado.criados).toBe(1);
    expect(prisma.alertaOperacional.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tipo: TipoAlertaOperacional.CLIENTE_SEM_RESPOSTA,
        severidade: SeveridadeAlerta.ATENCAO,
        proximaAcao: AcaoRecomendada.RESPONDER_CLIENTE,
      }),
    }));
  });
});
