import { Request, Response } from 'express';
import { z } from 'zod';
import pedidoService from '../services/pedido.service';
import taxaEntregaService, { FaixaEntrega } from '../services/taxaEntrega.service';
import { logger } from '../config/logger';
import { StatusLoja, StatusPedido } from '@prisma/client';
import realtimeService from '../services/realtime.service';
import prisma from '../config/database';

const schemaAtualizarStatus = z.object({
  status: z.string().min(1),
  motivoCancelamento: z.string().trim().optional(),
});

const schemaAtribuirMotoboy = z.object({
  motoboyId: z.string().nullable().optional(),
  observacaoEntrega: z.string().optional(),
});

const schemaAtualizarEndereco = z.object({
  endereco: z.string().trim().min(1, 'Endereço obrigatório'),
  bairro: z.string().trim().min(1, 'Bairro obrigatório'),
});

const schemaCriarMotoboy = z.object({
  nome: z.string().trim().min(2, 'Nome obrigatório'),
  telefone: z.string().trim().min(8, 'Telefone obrigatório'),
  empresa: z.enum(['PROPRIO', 'IFOOD', 'MUVE', 'FOOD99']).optional().default('PROPRIO'),
  status: z.enum(['DISPONIVEL', 'EM_ENTREGA', 'INATIVO']).optional().default('DISPONIVEL'),
});

const schemaAtualizarMotoboy = z.object({
  tipoRemuneracao: z.enum(['FIXO_POR_ENTREGA', 'PERCENTUAL_TAXA']).optional(),
  valorFixoPorEntrega: z.number().min(0).nullable().optional(),
  percentualEntregas: z.number().min(0).max(100).nullable().optional(),
});

const schemaCriarManual = z.object({
  pagamentoMetodo: z.enum(['PIX', 'DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO']),
  tipoAtendimento: z.enum(['ENTREGA', 'RETIRADA', 'CONSUMO_LOCAL']).optional().default('ENTREGA'),
  cliente: z.object({
    nome: z.string().trim().min(1),
    telefone: z.string().trim().min(1),
    endereco: z.string().trim().optional().default(''),
    bairro: z.string().trim().optional().default(''),
  }),
  itens: z.array(z.object({
    produtoId: z.string().min(1),
    quantidade: z.number().int().min(1),
    observacao: z.string().optional(),
  })).min(1),
  observacao: z.string().optional(),
  origem: z.enum(['SITE', 'WHATSAPP', 'MINERACAO', 'INDICACAO', 'CAMPANHA']).optional(),
  valorDinheiro: z.number().optional(),
});

const schemaCancelar = z.object({
  motivo: z.string().trim().min(1, 'Motivo obrigatório'),
});

const schemaStatusLoja = z.object({
  status: z.string().min(1),
  mensagem: z.string().optional(),
  entregadoresDisponiveisDia: z.number().int().min(0).optional(),
});

const schemaMercadoPagoConfig = z.object({
  ativo: z.boolean(),
  publicKey: z.string().optional().nullable(),
  accessToken: z.string().optional().nullable(),
  webhookSecret: z.string().optional().nullable(),
  webhookUrl: z.string().optional().nullable(),
});

function validar<T>(schema: z.ZodType<T>, data: unknown): { data: T } | { error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = result.error.errors.map(e => e.message).join('; ');
    return { error: msg };
  }
  return { data: result.data };
}

export class AdminPedidoController {
  private async emitirMetricasAtualizadas() {
    try {
      const metricas = await pedidoService.obterMetricasAdmin();
      realtimeService.emit('metricas:atualizadas', metricas);
    } catch (error) {
      logger.error('Erro ao emitir metricas atualizadas:', error);
    }
  }

  /**
   * GET /api/admin/fila-urgente
   */
  async filaUrgente(_req: Request, res: Response) {
    try {
      await pedidoService.sincronizarExpiracoesCheckout();
      const data = await pedidoService.obterFilaUrgente();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao buscar fila urgente:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao buscar fila urgente' },
      });
    }
  }

  /**
   * GET /api/admin/metricas
   */
  async metricas(_req: Request, res: Response) {
    try {
      await pedidoService.sincronizarExpiracoesCheckout();
      const data = await pedidoService.obterMetricasAdmin();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao buscar metricas admin:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao buscar metricas do admin' },
      });
    }
  }

  /**
   * GET /api/admin/pedidos
   */
  async listar(req: Request, res: Response) {
    try {
      await pedidoService.sincronizarExpiracoesCheckout();
      const { status, busca, page, limit } = req.query;
      const data = await pedidoService.listarPedidosAdmin({
        status: typeof status === 'string' ? status : undefined,
        busca: typeof busca === 'string' ? busca : undefined,
        page: typeof page === 'string' ? Number(page) : undefined,
        limit: typeof limit === 'string' ? Number(limit) : undefined,
      });

      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar pedidos admin:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao buscar pedidos do admin' },
      });
    }
  }

  /**
   * GET /api/admin/pedidos/:id
   */
  async buscarPorId(req: Request, res: Response) {
    try {
      await pedidoService.sincronizarExpiracoesCheckout();
      const { id } = req.params;
      const pedido = await pedidoService.buscarPedidoAdminPorId(id);

      if (!pedido) {
        return res.status(404).json({
          success: false,
          error: { message: 'Pedido não encontrado', code: 'PEDIDO_NAO_ENCONTRADO' },
        });
      }

      return res.json({ success: true, data: pedido });
    } catch (error) {
      logger.error('Erro ao buscar pedido admin por id:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao buscar pedido do admin' },
      });
    }
  }

  /**
   * PATCH /api/admin/pedidos/:id/status
   */
  async atualizarStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const parsed = validar(schemaAtualizarStatus, { ...req.body, status: String(req.body?.status || '').toUpperCase() });
      if ('error' in parsed) {
        return res.status(400).json({ success: false, error: { message: parsed.error, code: 'VALIDACAO_INVALIDA' } });
      }

      const { status, motivoCancelamento } = parsed.data;
      const validos = Object.values(StatusPedido);
      if (!validos.includes(status as StatusPedido)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Status inválido', code: 'STATUS_INVALIDO' },
        });
      }

      const data = await pedidoService.atualizarStatusAdmin(id, status as StatusPedido, motivoCancelamento, req.adminUser?.username);
      realtimeService.emit('pedido:atualizado', { id, status: data.status });
      void this.emitirMetricasAtualizadas();
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'PEDIDO_NAO_ENCONTRADO') {
        return res.status(404).json({
          success: false,
          error: { message: 'Pedido não encontrado', code: 'PEDIDO_NAO_ENCONTRADO' },
        });
      }

      if (error.message === 'TRANSICAO_INVALIDA') {
        return res.status(400).json({
          success: false,
          error: { message: 'Transição de status inválida', code: 'TRANSICAO_INVALIDA' },
        });
      }

      if (error.message === 'DESPACHO_SEM_ENTREGADOR') {
        return res.status(422).json({
          success: false,
          error: { message: 'Atribua um entregador antes de despachar o pedido', code: 'DESPACHO_SEM_ENTREGADOR' },
        });
      }

      logger.error('Erro ao atualizar status do pedido admin:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao atualizar status do pedido' },
      });
    }
  }

  /**
   * GET /api/admin/motoboys/status
   */
  async statusMotoboys(_req: Request, res: Response) {
    try {
      const data = await pedidoService.listarMotoboyStatus();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao buscar status dos motoboys:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao buscar status dos motoboys' },
      });
    }
  }

  /**
   * GET /api/admin/motoboys
   */
  async listarMotoboys(_req: Request, res: Response) {
    try {
      const data = await pedidoService.listarMotoboys();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar motoboys:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao listar motoboys' },
      });
    }
  }

  /**
   * POST /api/admin/motoboys
   */
  async criarMotoboy(req: Request, res: Response) {
    try {
      const parsed = validar(schemaCriarMotoboy, req.body);
      if ('error' in parsed) {
        return res.status(400).json({ success: false, error: { message: parsed.error, code: 'VALIDACAO_INVALIDA' } });
      }
      const data = await pedidoService.criarMotoboy(parsed.data);
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return res.status(409).json({ success: false, error: { message: 'Telefone já cadastrado', code: 'MOTOBOY_TELEFONE_DUPLICADO' } });
      }
      logger.error('Erro ao criar motoboy:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao criar motoboy' },
      });
    }
  }

  /**
   * PATCH /api/admin/pedidos/:id/motoboy
   */
  async atribuirMotoboy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const parsed = validar(schemaAtribuirMotoboy, req.body);
      if ('error' in parsed) {
        return res.status(400).json({ success: false, error: { message: parsed.error, code: 'VALIDACAO_INVALIDA' } });
      }
      const { motoboyId = null, observacaoEntrega } = parsed.data;
      const data = await pedidoService.atribuirMotoboy(id, motoboyId ?? null, observacaoEntrega, req.adminUser?.username);
      realtimeService.emit('pedido:atualizado', { id: data.id, motoboyId: data.motoboy?.id || null });
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'PEDIDO_NAO_ENCONTRADO') {
        return res.status(404).json({
          success: false,
          error: { message: 'Pedido não encontrado', code: 'PEDIDO_NAO_ENCONTRADO' },
        });
      }
      if (error.message === 'MOTOBOY_NAO_ENCONTRADO') {
        return res.status(404).json({
          success: false,
          error: { message: 'Motoboy não encontrado', code: 'MOTOBOY_NAO_ENCONTRADO' },
        });
      }
      logger.error('Erro ao atribuir motoboy:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao atribuir motoboy' },
      });
    }
  }

  /**
   * PATCH /api/admin/pedidos/:id/endereco
   */
  async atualizarEnderecoEntrega(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const parsed = validar(schemaAtualizarEndereco, req.body);
      if ('error' in parsed) {
        return res.status(400).json({ success: false, error: { message: parsed.error, code: 'ENDERECO_INVALIDO' } });
      }
      const { endereco, bairro } = parsed.data;
      const data = await pedidoService.atualizarEnderecoEntrega(id, endereco, bairro, req.adminUser?.username);
      realtimeService.emit('pedido:atualizado', { id });
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'PEDIDO_NAO_ENCONTRADO') {
        return res.status(404).json({
          success: false,
          error: { message: 'Pedido não encontrado', code: 'PEDIDO_NAO_ENCONTRADO' },
        });
      }
      if (error.message === 'BAIRRO_NAO_ATENDIDO') {
        return res.status(400).json({
          success: false,
          error: { message: 'Bairro não atendido', code: 'BAIRRO_NAO_ATENDIDO' },
        });
      }
      logger.error('Erro ao atualizar endereço de entrega:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao atualizar endereço de entrega' },
      });
    }
  }

  /**
   * POST /api/admin/pedidos/manual
   */
  async criarManual(req: Request, res: Response) {
    try {
      const rawBody = { ...req.body, pagamentoMetodo: String(req.body?.pagamentoMetodo || '').toUpperCase() };
      const parsed = validar(schemaCriarManual, rawBody);
      if ('error' in parsed) {
        return res.status(400).json({ success: false, error: { message: parsed.error, code: 'VALIDACAO_INVALIDA' } });
      }

      const data = await pedidoService.criarPedidoManual({
        ...parsed.data,
        operadorNome: req.adminUser?.username,
      });

      realtimeService.emit('pedido:novo', { id: data.id, status: data.status });
      void this.emitirMetricasAtualizadas();
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      logger.error('Erro ao criar pedido manual:', error);
      return res.status(400).json({
        success: false,
        error: { message: error?.message || 'Erro ao criar pedido manual' },
      });
    }
  }

  /**
   * POST /api/admin/pedidos/:id/cancelar
   */
  async cancelar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const parsed = validar(schemaCancelar, req.body);
      if ('error' in parsed) {
        return res.status(400).json({ success: false, error: { message: parsed.error, code: 'MOTIVO_OBRIGATORIO' } });
      }
      const { motivo } = parsed.data;
      const data = await pedidoService.cancelarPedidoAdmin(id, motivo, req.adminUser?.username);
      realtimeService.emit('pedido:atualizado', { id: data.id, status: data.status });
      void this.emitirMetricasAtualizadas();
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'PEDIDO_NAO_ENCONTRADO') {
        return res.status(404).json({
          success: false,
          error: { message: 'Pedido não encontrado', code: 'PEDIDO_NAO_ENCONTRADO' },
        });
      }
      logger.error('Erro ao cancelar pedido admin:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao cancelar pedido' },
      });
    }
  }

  /**
   * PATCH /api/admin/pedidos/:id/estorno
   */
  async marcarEstorno(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await pedidoService.marcarEstornoAdmin(id, req.adminUser?.username);
      realtimeService.emit('pedido:atualizado', { id: data.id, estorno: true });
      void this.emitirMetricasAtualizadas();
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'PEDIDO_NAO_ENCONTRADO') {
        return res.status(404).json({
          success: false,
          error: { message: 'Pedido não encontrado', code: 'PEDIDO_NAO_ENCONTRADO' },
        });
      }
      if (error.message === 'ESTORNO_STATUS_INVALIDO' || error.message === 'ESTORNO_NAO_NECESSARIO') {
        return res.status(400).json({
          success: false,
          error: { message: 'Pedido não está elegível para estorno', code: error.message },
        });
      }
      logger.error('Erro ao marcar estorno:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao marcar estorno' },
      });
    }
  }

  /**
   * GET /api/admin/loja/status
   */
  async obterStatusLoja(_req: Request, res: Response) {
    try {
      const data = await pedidoService.obterStatusLoja();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao obter status da loja:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao obter status da loja' },
      });
    }
  }

  /**
   * PATCH /api/admin/loja/status
   */
  async atualizarStatusLoja(req: Request, res: Response) {
    try {
      const parsed = validar(schemaStatusLoja, { ...req.body, status: String(req.body?.status || '').toUpperCase() });
      if ('error' in parsed) {
        return res.status(400).json({ success: false, error: { message: parsed.error, code: 'STATUS_LOJA_INVALIDO' } });
      }
      const { status, mensagem, entregadoresDisponiveisDia } = parsed.data;
      const validos = Object.values(StatusLoja);
      if (!validos.includes(status as StatusLoja)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Status de loja inválido', code: 'STATUS_LOJA_INVALIDO' },
        });
      }
      const data = await pedidoService.atualizarStatusLoja(status as StatusLoja, mensagem, entregadoresDisponiveisDia);
      realtimeService.emit('loja:status', data);
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'MENSAGEM_PAUSADO_OBRIGATORIA') {
        return res.status(400).json({
          success: false,
          error: { message: 'Mensagem é obrigatória quando loja está pausada', code: error.message },
        });
      }
      logger.error('Erro ao atualizar status da loja:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao atualizar status da loja' },
      });
    }
  }

  /**
   * GET /api/admin/clientes/geo
   */
  async clientesGeolocalizados(_req: Request, res: Response) {
    try {
      const clientes = await prisma.cliente.findMany({
        where: { ativo: true, lat: { not: null }, lng: { not: null } },
        select: {
          telefone: true, nome: true, bairro: true, endereco: true,
          lat: true, lng: true, nrinscr: true,
          pedidos: { select: { id: true }, where: { status: { not: 'CANCELADO' } } },
        },
      });
      const data = clientes.map((c) => ({
        telefone: c.telefone,
        nome: c.nome,
        bairro: c.bairro,
        endereco: c.endereco,
        lat: c.lat!,
        lng: c.lng!,
        nrinscr: c.nrinscr,
        totalPedidos: c.pedidos.length,
      }));
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao obter clientes geolocalizados:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao obter clientes' } });
    }
  }

  /**
   * GET /api/admin/loja/localizacao
   */
  async obterLocalizacaoLoja(_req: Request, res: Response) {
    try {
      const data = await pedidoService.obterLocalizacaoLoja();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao obter localização da loja:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao obter localização da loja' } });
    }
  }

  /**
   * PATCH /api/admin/loja/localizacao
   */
  async atualizarLocalizacaoLoja(req: Request, res: Response) {
    try {
      const { endereco, lat, lng } = req.body as { endereco?: string; lat?: number; lng?: number };
      if (!endereco?.trim() || typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ success: false, error: { message: 'endereco, lat e lng são obrigatórios' } });
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ success: false, error: { message: 'Coordenadas fora do intervalo válido' } });
      }
      const data = await pedidoService.atualizarLocalizacaoLoja(endereco, lat, lng);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao atualizar localização da loja:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao atualizar localização da loja' } });
    }
  }

  /**
   * GET /api/admin/pagamentos/mercadopago
   */
  async obterConfiguracaoMercadoPago(_req: Request, res: Response) {
    try {
      const data = await pedidoService.obterConfiguracaoMercadoPago();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao obter configuração do Mercado Pago:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao obter configuração do Mercado Pago' },
      });
    }
  }

  /**
   * PATCH /api/admin/pagamentos/mercadopago
   */
  async atualizarConfiguracaoMercadoPago(req: Request, res: Response) {
    try {
      const parsed = validar(schemaMercadoPagoConfig, req.body);
      if ('error' in parsed) {
        return res.status(400).json({ success: false, error: { message: parsed.error, code: 'MERCADOPAGO_CONFIG_INVALIDA' } });
      }
      const data = await pedidoService.atualizarConfiguracaoMercadoPago(parsed.data);
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao atualizar configuração do Mercado Pago:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao atualizar configuração do Mercado Pago' },
      });
    }
  }
  /**
   * GET /api/admin/loja/faixas-entrega
   */
  async obterFaixasEntrega(_req: Request, res: Response) {
    try {
      const faixas = await taxaEntregaService.obterFaixas();
      return res.json({ success: true, data: faixas });
    } catch (error) {
      logger.error('Erro ao obter faixas de entrega:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao obter faixas de entrega' } });
    }
  }

  /**
   * PUT /api/admin/loja/faixas-entrega
   */
  async salvarFaixasEntrega(req: Request, res: Response) {
    try {
      const schemaFaixa = z.object({
        ateKm: z.number().positive(),
        tipo: z.enum(['GRATIS', 'FIXO', 'POR_KM']),
        valor: z.number().min(0),
      });
      const schema = z.array(schemaFaixa);
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: { message: 'Dados inválidos', details: parsed.error.errors } });
      }
      // Garante que estão ordenadas por ateKm
      const faixas: FaixaEntrega[] = parsed.data.sort((a, b) => a.ateKm - b.ateKm);
      await taxaEntregaService.salvarFaixas(faixas);
      return res.json({ success: true, data: faixas });
    } catch (error) {
      logger.error('Erro ao salvar faixas de entrega:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao salvar faixas de entrega' } });
    }
  }
  /**
   * PATCH /api/admin/motoboys/:id
   */
  async atualizarMotoboy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const parsed = schemaAtualizarMotoboy.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: { message: 'Dados inválidos' } });
      }
      const data = await prisma.motoboy.update({
        where: { id },
        data: parsed.data,
        select: {
          id: true, nome: true, telefone: true, empresa: true, status: true,
          tipoRemuneracao: true, percentualEntregas: true, valorFixoPorEntrega: true,
        },
      });
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao atualizar motoboy:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao atualizar motoboy' } });
    }
  }

  /**
   * GET /api/admin/motoboys/:id/acerto?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
   */
  async acertoMotoboy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const inicio = req.query.inicio as string;
      const fim = req.query.fim as string;

      if (!inicio || !fim) {
        return res.status(400).json({ success: false, error: { message: 'Parâmetros inicio e fim obrigatórios' } });
      }

      const motoboy = await prisma.motoboy.findUnique({
        where: { id },
        select: {
          id: true, nome: true, telefone: true,
          tipoRemuneracao: true, percentualEntregas: true, valorFixoPorEntrega: true,
        },
      });
      if (!motoboy) {
        return res.status(404).json({ success: false, error: { message: 'Entregador não encontrado' } });
      }

      const inicioDate = new Date(`${inicio}T00:00:00-03:00`);
      const fimDate = new Date(`${fim}T23:59:59-03:00`);

      const entregas = await prisma.pedido.findMany({
        where: {
          motoboyId: id,
          status: 'ENTREGUE',
          statusMudouEm: { gte: inicioDate, lte: fimDate },
        },
        select: {
          id: true,
          taxaEntrega: true,
          total: true,
          statusMudouEm: true,
        },
        orderBy: { statusMudouEm: 'asc' },
      });

      const totalEntregas = entregas.length;
      const totalTaxas = entregas.reduce((s, p) => s + Number(p.taxaEntrega || 0), 0);
      const totalPedidos = entregas.reduce((s, p) => s + Number(p.total || 0), 0);

      let valorAcerto = 0;
      if (motoboy.tipoRemuneracao === 'FIXO_POR_ENTREGA') {
        valorAcerto = totalEntregas * (motoboy.valorFixoPorEntrega ?? 0);
      } else {
        valorAcerto = totalTaxas * ((motoboy.percentualEntregas ?? 0) / 100);
      }

      return res.json({
        success: true,
        data: {
          motoboy,
          periodo: { inicio, fim },
          totalEntregas,
          totalTaxas,
          totalPedidos,
          valorAcerto,
          entregas: entregas.map((p, i) => ({
            id: p.id,
            numero: i + 1,
            taxaEntrega: Number(p.taxaEntrega || 0),
            total: Number(p.total || 0),
            data: p.statusMudouEm,
          })),
        },
      });
    } catch (error) {
      logger.error('Erro ao calcular acerto:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao calcular acerto' } });
    }
  }
}

export default new AdminPedidoController();
